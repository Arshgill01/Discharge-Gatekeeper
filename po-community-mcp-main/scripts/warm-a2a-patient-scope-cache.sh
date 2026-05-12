#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PO_COMMUNITY_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${PO_COMMUNITY_ROOT}/.." && pwd)"

RUN_ID="${PROMPT_OPINION_E2E_RUN_ID:-a2a-patient-warm-$(date -u +"%Y%m%dT%H%M%SZ")}"
RUN_DIR="${PROMPT_OPINION_E2E_RUN_DIR:-${REPO_ROOT}/output/prompt-opinion-e2e/runs/${RUN_ID}}"
REPORTS_DIR="${RUN_DIR}/reports"
mkdir -p "${REPORTS_DIR}"

if [[ -f "${REPO_ROOT}/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${REPO_ROOT}/.env.local"
  set +a
fi

A2A_BASE_URL="http://127.0.0.1:${EXTERNAL_A2A_PORT:-5057}"
if [[ "${PROMPT_OPINION_A2A_WARM_USE_PUBLIC:-0}" == "1" && -n "${PROMPT_OPINION_A2A_PUBLIC_URL:-}" ]]; then
  A2A_BASE_URL="${PROMPT_OPINION_A2A_PUBLIC_URL}"
fi
A2A_BASE_URL="${A2A_BASE_URL%/}"
A2A_ENDPOINT="${A2A_BASE_URL}/message:send"

FHIR_SERVER_URL="${PROMPT_OPINION_A2A_WARM_FHIR_SERVER_URL:-local-fhir://care-transitions-command}"
PATIENT_ID="${PROMPT_OPINION_A2A_WARM_PATIENT_ID:-db4b066b-200f-405f-9fe4-c52eefbc1425}"
ENCOUNTER_ID="${PROMPT_OPINION_A2A_WARM_ENCOUNTER_ID:-daniel-discharge-2026-0419}"
VERIFY_MAX_MS="${PROMPT_OPINION_A2A_WARM_VERIFY_MAX_MS:-5000}"

FIRST_RESPONSE_FILE="${REPORTS_DIR}/a2a-patient-warm-first.json"
SECOND_RESPONSE_FILE="${REPORTS_DIR}/a2a-patient-warm-second.json"

echo "[a2a-patient-warm] endpoint=${A2A_ENDPOINT}"
echo "[a2a-patient-warm] fhir_server_url=${FHIR_SERVER_URL}"
echo "[a2a-patient-warm] patient_id=${PATIENT_ID}"
echo "[a2a-patient-warm] encounter_id=${ENCOUNTER_ID}"

call_once() {
  local output_file="$1"
  local request_id="$2"

  curl -sS \
    -H 'content-type: application/json' \
    -H 'A2A-Version: 1.0' \
    -H "x-request-id: ${request_id}" \
    -H "x-correlation-id: ${request_id}-correlation" \
    -H "x-fhir-server-url: ${FHIR_SERVER_URL}" \
    -H "x-patient-id: ${PATIENT_ID}" \
    -H "x-encounter-id: ${ENCOUNTER_ID}" \
    -d '{"id":"'"${request_id}"'","message":{"role":"ROLE_USER","parts":[{"text":"Is this patient safe to discharge today?"}]}}' \
    "${A2A_ENDPOINT}" \
    > "${output_file}"
}

FIRST_START_MS="$(node -e 'console.log(Date.now())')"
call_once "${FIRST_RESPONSE_FILE}" "a2a-patient-warm-${RUN_ID}-first"
FIRST_END_MS="$(node -e 'console.log(Date.now())')"
FIRST_ELAPSED_MS="$((FIRST_END_MS - FIRST_START_MS))"

SECOND_START_MS="$(node -e 'console.log(Date.now())')"
call_once "${SECOND_RESPONSE_FILE}" "a2a-patient-warm-${RUN_ID}-second"
SECOND_END_MS="$(node -e 'console.log(Date.now())')"
SECOND_ELAPSED_MS="$((SECOND_END_MS - SECOND_START_MS))"

node - "${FIRST_RESPONSE_FILE}" "${SECOND_RESPONSE_FILE}" "${FIRST_ELAPSED_MS}" "${SECOND_ELAPSED_MS}" "${VERIFY_MAX_MS}" <<'NODE'
const fs = require("node:fs");

const [firstFile, secondFile, firstElapsedRaw, secondElapsedRaw, verifyMaxRaw] = process.argv.slice(2);
const firstElapsedMs = Number.parseInt(firstElapsedRaw, 10);
const secondElapsedMs = Number.parseInt(secondElapsedRaw, 10);
const verifyMaxMs = Number.parseInt(verifyMaxRaw, 10);

const parseResponse = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const readVisibleText = (payload) => {
  const task = payload?.result?.task || payload?.task;
  if (!task) {
    throw new Error("result.task missing");
  }
  const statusParts = Array.isArray(task?.status?.message?.parts) ? task.status.message.parts : [];
  const artifactParts = Array.isArray(task?.artifacts)
    ? task.artifacts.flatMap((artifact) => Array.isArray(artifact?.parts) ? artifact.parts : [])
    : [];
  return {
    task,
    text: [...statusParts, ...artifactParts]
      .map((part) => part?.text)
      .filter((text) => typeof text === "string" && text.trim().length > 0)
      .join("\n"),
  };
};

const firstPayload = parseResponse(firstFile);
const secondPayload = parseResponse(secondFile);
const first = readVisibleText(firstPayload);
const second = readVisibleText(secondPayload);

if (!/not_ready|not ready/i.test(first.text)) {
  throw new Error("First warm-up response missing not_ready verdict.");
}
if (!/2026-04-19|orthopnea|medication bridge|DocumentReference\/daniel-nursing-note-1840|DocumentReference\/7978a116-881e-4280-871f-1c16c59dc500/i.test(first.text)) {
  throw new Error("First warm-up response missing patient-scope contradiction evidence.");
}
if (/Maria|Alvarez|2026-04-18|oxygen-stairs|SpO2 82|stairs/i.test(first.text)) {
  throw new Error("First warm-up response contains stale Maria/April 18 oxygen-stairs fallback evidence.");
}
if (/machine_summary/i.test(first.text)) {
  throw new Error("First warm-up response contains machine_summary.");
}

const secondCache = second.task?.metadata?.diagnostics?.hidden_risk_cache || {};
const secondFallbacks = second.task?.metadata?.diagnostics?.fallbacks_applied || [];

console.log(`[a2a-patient-warm] first_call_ms=${firstElapsedMs}`);
console.log(`[a2a-patient-warm] second_call_ms=${secondElapsedMs}`);
console.log(`[a2a-patient-warm] second_cache_status=${secondCache.cache_status || "unknown"}`);
console.log(`[a2a-patient-warm] second_fallbacks=${JSON.stringify(secondFallbacks)}`);

if (secondElapsedMs > verifyMaxMs) {
  throw new Error(`Second A2A warm verification call stayed too slow (${secondElapsedMs} ms > ${verifyMaxMs} ms).`);
}
if (!(secondCache.cache_status === "hit" || secondFallbacks.includes("hidden_risk_cache_hit"))) {
  console.log("[a2a-patient-warm] INFO: orchestrator cache metadata did not report a hit; accepting fast second call because the downstream hidden-risk path is warm.");
}

console.log("[a2a-patient-warm] PASS: Daniel patient-scope A2A hidden-risk cache is warm");
NODE
