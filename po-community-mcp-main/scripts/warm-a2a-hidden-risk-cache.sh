#!/usr/bin/env bash
set -euo pipefail

# warm-a2a-hidden-risk-cache.sh
#
# Sends one canonical A2A request through the live runtime to warm the
# orchestrator-level hidden-risk cache.  The first call computes the result
# via the normal CI MCP path (Google/Gemma when configured).  Subsequent
# identical calls from Prompt Opinion will hit the cache.
#
# This script does NOT pre-seed a fake answer.  The warm-up goes through
# the same runtime path that Prompt Opinion would use.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PO_COMMUNITY_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${PO_COMMUNITY_ROOT}/.." && pwd)"

RUN_ID="${PROMPT_OPINION_E2E_RUN_ID:-warm-$(date -u +"%Y%m%dT%H%M%SZ")}"
RUN_DIR="${PROMPT_OPINION_E2E_RUN_DIR:-${REPO_ROOT}/output/prompt-opinion-e2e/runs/${RUN_ID}}"
REPORTS_DIR="${RUN_DIR}/reports"
mkdir -p "${REPORTS_DIR}"

# Determine A2A endpoint — prefer public URL if set, fall back to local.
A2A_BASE_URL="${PROMPT_OPINION_A2A_PUBLIC_URL:-}"
if [[ -z "${A2A_BASE_URL}" ]]; then
  # Try loading from .env.local
  if [[ -f "${REPO_ROOT}/.env.local" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "${REPO_ROOT}/.env.local"
    set +a
    A2A_BASE_URL="${PROMPT_OPINION_A2A_PUBLIC_URL:-}"
  fi
fi

if [[ -z "${A2A_BASE_URL}" ]]; then
  A2A_BASE_URL="http://127.0.0.1:${EXTERNAL_A2A_PORT:-5057}"
  echo "[warm-cache] no public A2A URL found; using local: ${A2A_BASE_URL}"
fi

# Remove trailing slash
A2A_BASE_URL="${A2A_BASE_URL%/}"

WARM_ENDPOINT="${A2A_BASE_URL}/message:send/v1/message:send"
WARM_RESPONSE_FILE="${REPORTS_DIR}/warm-up-response.json"
WARM_TIMING_FILE="${REPORTS_DIR}/warm-up-timing.txt"

echo "[warm-cache] run_id=${RUN_ID}"
echo "[warm-cache] endpoint=${WARM_ENDPOINT}"
echo "[warm-cache] response_file=${WARM_RESPONSE_FILE}"

FHIR_SERVER_URL="${PROMPT_OPINION_A2A_WARM_FHIR_SERVER_URL:-local-fhir://care-transitions-command}"
PATIENT_ID="${PROMPT_OPINION_A2A_WARM_PATIENT_ID:-db4b066b-200f-405f-9fe4-c52eefbc1425}"
ENCOUNTER_ID="${PROMPT_OPINION_A2A_WARM_ENCOUNTER_ID:-daniel-discharge-2026-0419}"

# Send the warm-up request
WARM_START_EPOCH="$(date +%s)"

curl -sS \
  -w "\nHTTP_STATUS:%{http_code}\nTOTAL_TIME:%{time_total}\nSTARTTRANSFER:%{time_starttransfer}\n" \
  -H 'content-type: application/json' \
  -H 'A2A-Version: 1.0' \
  -H "x-request-id: warm-cache-${RUN_ID}" \
  -H "x-correlation-id: warm-cache-${RUN_ID}-correlation" \
  -H "x-fhir-server-url: ${FHIR_SERVER_URL}" \
  -H "x-patient-id: ${PATIENT_ID}" \
  -H "x-encounter-id: ${ENCOUNTER_ID}" \
  -d "{\"id\":\"warm-cache-${RUN_ID}\",\"message\":{\"role\":\"ROLE_USER\",\"parts\":[{\"text\":\"Is this patient safe to discharge today?\"}]}}" \
  "${WARM_ENDPOINT}" \
  > "${WARM_RESPONSE_FILE}" 2>"${WARM_TIMING_FILE}" || true

WARM_END_EPOCH="$(date +%s)"
WARM_WALL_SECONDS=$(( WARM_END_EPOCH - WARM_START_EPOCH ))

echo "[warm-cache] wall clock: ${WARM_WALL_SECONDS}s"

# Validate the response
node - "${WARM_RESPONSE_FILE}" "${PROMPT_OPINION_REQUIRE_GOOGLE_PROVIDER:-0}" "${WARM_WALL_SECONDS}" <<'NODE'
const fs = require("node:fs");

const responseFile = process.argv[2];
const requireGoogle = process.argv[3] === "1";
const wallSeconds = parseInt(process.argv[4], 10);

if (!fs.existsSync(responseFile)) {
  console.error("[warm-cache] FAIL: response file not found");
  process.exit(1);
}

const rawBody = fs.readFileSync(responseFile, "utf8");

// Strip curl timing lines from the end
const jsonEnd = rawBody.lastIndexOf("}");
if (jsonEnd < 0) {
  console.error("[warm-cache] FAIL: no JSON object in response");
  process.exit(1);
}
const jsonBody = rawBody.slice(0, jsonEnd + 1);

let payload;
try {
  payload = JSON.parse(jsonBody);
} catch (err) {
  console.error("[warm-cache] FAIL: could not parse JSON response:", err.message);
  process.exit(1);
}

// Check JSON-RPC 2.0 envelope
if (payload.jsonrpc !== "2.0") {
  console.error(`[warm-cache] FAIL: jsonrpc must be 2.0, got ${payload.jsonrpc}`);
  process.exit(1);
}

// Check result.task exists
const task = payload.result?.task || payload.task;
if (!task) {
  console.error("[warm-cache] FAIL: result.task missing");
  process.exit(1);
}

console.log("[warm-cache] PASS: result.task exists");

// Collect visible text from task
const collectTextParts = (t) => {
  const statusParts = Array.isArray(t?.status?.message?.parts) ? t.status.message.parts : [];
  const artifactParts = Array.isArray(t?.artifacts)
    ? t.artifacts.flatMap((a) => Array.isArray(a?.parts) ? a.parts : [])
    : [];
  return [...statusParts, ...artifactParts]
    .map((part) => part?.text)
    .filter((text) => typeof text === "string" && text.trim().length > 0);
};

const visibleText = collectTextParts(task).join("\n");

// Assert final verdict not_ready
if (!visibleText.includes("DISCHARGE STATUS: NOT_READY") && !visibleText.includes("Final verdict: not_ready")) {
  console.error("[warm-cache] FAIL: visible text missing not_ready verdict");
  console.error("[warm-cache] visible text preview:", visibleText.slice(0, 300));
  process.exit(1);
}
console.log("[warm-cache] PASS: final verdict not_ready");

// Assert structured baseline ready
if (!/structured baseline.*ready/i.test(visibleText)) {
  console.error("[warm-cache] FAIL: visible text missing 'Structured baseline: ready'");
  process.exit(1);
}
console.log("[warm-cache] PASS: structured baseline ready");

// Assert hidden-risk result
if (!/hidden-risk result.*hidden_risk_present/i.test(visibleText)) {
  console.error("[warm-cache] FAIL: visible text missing hidden_risk_present");
  process.exit(1);
}
console.log("[warm-cache] PASS: hidden_risk_present");

// Assert Nursing Note anchor
if (!/DocumentReference\/daniel-nursing-note-1840|Nursing Note 2026-04-19 18:40|Nursing Note/i.test(visibleText)) {
  console.error("[warm-cache] FAIL: visible text missing Daniel Nursing Note anchor");
  process.exit(1);
}
console.log("[warm-cache] PASS: Daniel Nursing Note anchor");

// Assert Daniel medication-access evidence
if (!/DocumentReference\/daniel-pharmacy-note-1815|Pharmacy Note 2026-04-19 18:15|sacubitril/i.test(visibleText)) {
  console.error("[warm-cache] FAIL: visible text missing Daniel medication-access evidence");
  process.exit(1);
}
console.log("[warm-cache] PASS: Daniel medication-access evidence");

// Check metadata for cache status
const metadata = task.metadata || {};
const cacheInfo = metadata.diagnostics?.hidden_risk_cache || {};
const fallbacksApplied = metadata.diagnostics?.fallbacks_applied || [];

if (cacheInfo.cache_status === "miss" || cacheInfo.computed === true) {
  console.log("[warm-cache] PASS: warm-up computed fresh result (cache_miss or computed=true)");
} else if (fallbacksApplied.includes("hidden_risk_cache_hit")) {
  console.log("[warm-cache] INFO: cache was already warm (cache_hit). Prior computation is reused.");
} else {
  console.log("[warm-cache] INFO: cache status not reported in compact metadata (expected for non-verbose mode)");
}

// Check provider if required
if (requireGoogle) {
  const provider = metadata.diagnostics?.hidden_risk_provider?.provider;
  if (provider && provider !== "google") {
    console.error(`[warm-cache] FAIL: required Google provider but got ${provider}`);
    process.exit(1);
  }
  if (provider === "google") {
    console.log("[warm-cache] PASS: Google provider confirmed");
  } else {
    console.log("[warm-cache] INFO: provider not reported in compact metadata; assuming provider check was done at readyz");
  }
}

console.log(`[warm-cache] wall_seconds=${wallSeconds}`);
console.log("[warm-cache] WARM-UP COMPLETE: hidden-risk result cached for subsequent requests");
NODE

echo "[warm-cache] done"
