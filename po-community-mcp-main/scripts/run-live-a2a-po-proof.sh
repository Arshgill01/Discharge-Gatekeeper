#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PO_COMMUNITY_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${PO_COMMUNITY_ROOT}/.." && pwd)"

OUTPUT_ROOT="${PROMPT_OPINION_E2E_OUTPUT_ROOT:-${REPO_ROOT}/output/prompt-opinion-e2e}"
RUN_ID="${PROMPT_OPINION_E2E_RUN_ID:-$(date -u +"%Y%m%dT%H%M%SZ")}"
RUN_DIR="${PROMPT_OPINION_E2E_RUN_DIR:-${OUTPUT_ROOT}/runs/${RUN_ID}}"
LOG_DIR="${RUN_DIR}/logs"
REPORTS_DIR="${RUN_DIR}/reports"
NOTES_DIR="${RUN_DIR}/notes"
SCREENSHOTS_DIR="${RUN_DIR}/screenshots"
SUMMARY_FILE="${REPORTS_DIR}/live-a2a-proof-preflight-summary.md"
LOCAL_PROTOCOL_RESPONSE_FILE="${REPORTS_DIR}/live-a2a-local-protocol-response.json"
PUBLIC_PROTOCOL_RESPONSE_FILE="${REPORTS_DIR}/live-a2a-public-protocol-response.json"

DISCHARGE_GATEKEEPER_HOST="${DISCHARGE_GATEKEEPER_HOST:-127.0.0.1}"
DISCHARGE_GATEKEEPER_PORT="${DISCHARGE_GATEKEEPER_PORT:-5055}"
CLINICAL_INTELLIGENCE_HOST="${CLINICAL_INTELLIGENCE_HOST:-127.0.0.1}"
CLINICAL_INTELLIGENCE_PORT="${CLINICAL_INTELLIGENCE_PORT:-5056}"
EXTERNAL_A2A_HOST="${EXTERNAL_A2A_HOST:-127.0.0.1}"
EXTERNAL_A2A_PORT="${EXTERNAL_A2A_PORT:-5057}"

LOCAL_DGK_BASE_URL="http://${DISCHARGE_GATEKEEPER_HOST}:${DISCHARGE_GATEKEEPER_PORT}"
LOCAL_CI_BASE_URL="http://${CLINICAL_INTELLIGENCE_HOST}:${CLINICAL_INTELLIGENCE_PORT}"
LOCAL_A2A_BASE_URL="http://${EXTERNAL_A2A_HOST}:${EXTERNAL_A2A_PORT}"
EXPECTED_LOCAL_DGK_MCP_URL="${LOCAL_DGK_BASE_URL}/mcp"
EXPECTED_LOCAL_CI_MCP_URL="${LOCAL_CI_BASE_URL}/mcp"

mkdir -p "${LOG_DIR}" "${REPORTS_DIR}" "${NOTES_DIR}" "${SCREENSHOTS_DIR}"

BRANCH_NAME="$(git -C "${REPO_ROOT}" branch --show-current 2>/dev/null || echo unknown)"
COMMIT_SHA="$(git -C "${REPO_ROOT}" rev-parse HEAD 2>/dev/null || echo unknown)"

cat > "${REPORTS_DIR}/run-metadata.json" <<EOF
{
  "run_id": "${RUN_ID}",
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "branch": "${BRANCH_NAME}",
  "commit": "${COMMIT_SHA}",
  "repo_root": "${REPO_ROOT}",
  "output_root": "${OUTPUT_ROOT}",
  "run_dir": "${RUN_DIR}"
}
EOF

local_dgk_ready=false
local_ci_ready=false
local_a2a_ready=false
public_dgk_ready=false
public_ci_ready=false
public_a2a_ready=false
local_result_task=false
public_result_task=false
browser_proof_status="not_run"
browser_failure_timing="n/a"
OVERRIDE_ENV_VARS=(
  PROMPT_OPINION_DGK_PUBLIC_URL
  PROMPT_OPINION_CI_PUBLIC_URL
  PROMPT_OPINION_A2A_PUBLIC_URL
  PROMPT_OPINION_REQUIRE_GOOGLE_PROVIDER
)

preserve_env_var() {
  local name="$1"
  local set_name="REQUESTED_${name}_SET"
  local value_name="REQUESTED_${name}"

  if [[ "${!name+x}" == "x" ]]; then
    printf -v "${set_name}" "%s" "1"
    printf -v "${value_name}" "%s" "${!name}"
  else
    printf -v "${set_name}" "%s" "0"
    printf -v "${value_name}" "%s" ""
  fi
}

restore_env_var() {
  local name="$1"
  local set_name="REQUESTED_${name}_SET"
  local value_name="REQUESTED_${name}"

  if [[ "${!set_name:-0}" == "1" ]]; then
    export "${name}=${!value_name}"
  fi
}

load_repo_env() {
  local name

  for name in "${OVERRIDE_ENV_VARS[@]}"; do
    preserve_env_var "${name}"
  done

  if [[ -f "${REPO_ROOT}/.env.local" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "${REPO_ROOT}/.env.local"
    set +a
  fi

  for name in "${OVERRIDE_ENV_VARS[@]}"; do
    restore_env_var "${name}"
  done
}

write_summary() {
  cat > "${SUMMARY_FILE}" <<EOF
# Live A2A Prompt Opinion proof preflight summary

- Run ID: \`${RUN_ID}\`
- Generated at (UTC): \`$(date -u +"%Y-%m-%dT%H:%M:%SZ")\`
- Branch: \`${BRANCH_NAME}\`
- Commit: \`${COMMIT_SHA}\`
- Run folder: \`output/prompt-opinion-e2e/runs/${RUN_ID}\`

## Status

- local DGK ready: ${local_dgk_ready}
- local CI ready: ${local_ci_ready}
- local A2A ready: ${local_a2a_ready}
- public DGK ready: ${public_dgk_ready}
- public CI ready: ${public_ci_ready}
- public A2A ready: ${public_a2a_ready}
- local result.task: ${local_result_task}
- public result.task: ${public_result_task}
- browser proof status: ${browser_proof_status}
- browser proof failure timing: ${browser_failure_timing}

## Evidence paths

- local protocol response: \`reports/$(basename "${LOCAL_PROTOCOL_RESPONSE_FILE}")\`
- public protocol response: \`reports/$(basename "${PUBLIC_PROTOCOL_RESPONSE_FILE}")\`
- browser proof summary: \`reports/browser-proof-summary.json\`
- browser runtime correlation: \`reports/a2a-runtime-correlation-summary.json\`
- browser runtime log delta: \`reports/runtime-log-delta.json\`
EOF
}

trap write_summary EXIT

trim_trailing_slash() {
  local value="$1"
  while [[ "${value}" == */ ]]; do
    value="${value%/}"
  done
  printf '%s\n' "${value}"
}

normalize_readyz_url() {
  local url
  url="$(trim_trailing_slash "$1")"
  if [[ "${url}" == */mcp ]]; then
    printf '%s\n' "${url%/mcp}/readyz"
    return
  fi
  printf '%s/readyz\n' "${url}"
}

require_env_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "[live-a2a-proof] missing required environment variable: ${name}" >&2
    exit 1
  fi
}

run_logged() {
  local label="$1"
  local slug="$2"
  shift 2
  local log_file="${LOG_DIR}/${slug}.log"
  echo "[live-a2a-proof] ${label}"
  if "$@" > >(tee "${log_file}") 2>&1; then
    return 0
  fi
  local rc=$?
  echo "[live-a2a-proof] ${label} failed. See ${log_file}" >&2
  return "${rc}"
}

curl_http_200() {
  local url="$1"
  local output_file="$2"
  local label="$3"
  local http_code

  if ! http_code="$(curl -sS -L -o "${output_file}" -w '%{http_code}' "${url}")"; then
    echo "[live-a2a-proof] ${label} request failed: ${url}" >&2
    return 1
  fi

  if [[ "${http_code}" != "200" ]]; then
    echo "[live-a2a-proof] ${label} expected HTTP 200, got ${http_code}: ${url}" >&2
    return 1
  fi

  return 0
}

check_local_mcp_ready() {
  local ready_url="$1"
  local expected_name="$2"
  local output_file="$3"
  local require_google="$4"

  curl_http_200 "${ready_url}" "${output_file}" "${expected_name} /readyz"

  node - "${output_file}" "${expected_name}" "${require_google}" <<'NODE'
const fs = require("node:fs");

const payload = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const expectedName = process.argv[3];
const requireGoogle = process.argv[4] === "1";

if (payload.status !== "ok") {
  throw new Error(`${expectedName} status must be ok, got ${payload.status}`);
}
if (payload.server_name !== expectedName) {
  throw new Error(`${expectedName} server_name mismatch: ${payload.server_name}`);
}
if (!Array.isArray(payload.tools) || payload.tools.length === 0) {
  throw new Error(`${expectedName} tools must be a non-empty array`);
}
if (requireGoogle) {
  const provider = payload.hidden_risk_provider;
  if (!provider || provider.provider !== "google") {
    throw new Error(`Clinical Intelligence provider evidence must be google, got ${provider?.provider ?? "missing"}`);
  }
  if (provider.key_present !== true) {
    throw new Error("Clinical Intelligence provider evidence must report key_present=true");
  }
}
NODE
}

check_local_a2a_ready() {
  local ready_file="$1"
  local card_file="$2"
  local tasks_file="$3"

  curl_http_200 "${LOCAL_A2A_BASE_URL}/readyz" "${ready_file}" "local A2A /readyz"
  curl_http_200 "${LOCAL_A2A_BASE_URL}/.well-known/agent-card.json" "${card_file}" "local A2A agent card"
  curl_http_200 "${LOCAL_A2A_BASE_URL}/tasks" "${tasks_file}" "local A2A /tasks"

  node - "${ready_file}" "${card_file}" "${tasks_file}" "${EXPECTED_LOCAL_DGK_MCP_URL}" "${EXPECTED_LOCAL_CI_MCP_URL}" <<'NODE'
const fs = require("node:fs");

const ready = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const card = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const tasks = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const expectedDgkUrl = process.argv[5];
const expectedCiUrl = process.argv[6];

if (ready.status !== "ok") {
  throw new Error(`local A2A readyz status must be ok, got ${ready.status}`);
}
if (ready.server_name !== "external A2A orchestrator") {
  throw new Error(`local A2A server_name mismatch: ${ready.server_name}`);
}
if (ready.dependencies?.discharge_gatekeeper_mcp_url !== expectedDgkUrl) {
  throw new Error(`local A2A DGK dependency mismatch: expected ${expectedDgkUrl}, got ${ready.dependencies?.discharge_gatekeeper_mcp_url}`);
}
if (ready.dependencies?.clinical_intelligence_mcp_url !== expectedCiUrl) {
  throw new Error(`local A2A CI dependency mismatch: expected ${expectedCiUrl}, got ${ready.dependencies?.clinical_intelligence_mcp_url}`);
}
if (!Array.isArray(card.capabilities?.dependencies) || card.capabilities.dependencies.length !== 2) {
  throw new Error("local A2A agent card must list both MCP dependencies");
}
if (card.capabilities.dependencies[0]?.mcp_endpoint !== expectedDgkUrl) {
  throw new Error(`local A2A agent card DGK dependency mismatch: expected ${expectedDgkUrl}, got ${card.capabilities.dependencies[0]?.mcp_endpoint}`);
}
if (card.capabilities.dependencies[1]?.mcp_endpoint !== expectedCiUrl) {
  throw new Error(`local A2A agent card CI dependency mismatch: expected ${expectedCiUrl}, got ${card.capabilities.dependencies[1]?.mcp_endpoint}`);
}
if (card.capabilities?.task_lifecycle?.streaming !== false || card.capabilities?.task_lifecycle?.mode !== "synchronous") {
  throw new Error("local A2A task lifecycle must be synchronous and non-streaming");
}
if (!card.task_surface || card.task_surface.supports_streaming !== false) {
  throw new Error("local A2A task_surface.supports_streaming must be false");
}
if (typeof tasks.count !== "number" || !Array.isArray(tasks.tasks)) {
  throw new Error("local A2A /tasks payload must expose count and tasks[]");
}
NODE
}

check_public_a2a_ready() {
  local ready_file="$1"
  local card_file="$2"
  local tasks_file="$3"
  local public_base_url
  public_base_url="$(trim_trailing_slash "${PROMPT_OPINION_A2A_PUBLIC_URL}")"

  curl_http_200 "${public_base_url}/readyz" "${ready_file}" "public A2A /readyz"
  curl_http_200 "${public_base_url}/.well-known/agent-card.json" "${card_file}" "public A2A agent card"
  curl_http_200 "${public_base_url}/tasks" "${tasks_file}" "public A2A /tasks"
}

protocol_preflight() {
  local endpoint="$1"
  local response_file="$2"
  local label="$3"

  node - "${endpoint}" "${response_file}" "${label}" <<'NODE'
const fs = require("node:fs");

const endpoint = process.argv[2];
const responseFile = process.argv[3];
const label = process.argv[4];
const requestId = `${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-request`;
const requiredStrings = [
  "Final verdict: not_ready",
  "Structured baseline: ready",
  "Hidden-risk result: hidden_risk_present",
  "Nursing Note 2026-04-18 20:40",
  "Case Management Addendum 2026-04-18 20:55",
];

const collectTextParts = (task) => {
  const statusParts = Array.isArray(task?.status?.message?.parts) ? task.status.message.parts : [];
  const artifactParts = Array.isArray(task?.artifacts)
    ? task.artifacts.flatMap((artifact) => Array.isArray(artifact?.parts) ? artifact.parts : [])
    : [];

  return [...statusParts, ...artifactParts]
    .map((part) => part?.text)
    .filter((value) => typeof value === "string" && value.trim().length > 0);
};

const run = async () => {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "A2A-Version": "1.0",
      "x-request-id": requestId,
      "x-correlation-id": `${requestId}-correlation`,
    },
    body: JSON.stringify({
      id: requestId,
      message: {
        role: "ROLE_USER",
        parts: [{ text: "Is this patient safe to discharge today?" }],
      },
    }),
  });

  const rawBody = await response.text();
  fs.writeFileSync(responseFile, rawBody);

  if (response.status !== 200) {
    throw new Error(`${label} expected HTTP 200, got ${response.status}`);
  }

  const payload = JSON.parse(rawBody);
  if (payload.jsonrpc !== "2.0") {
    throw new Error(`${label} jsonrpc must equal 2.0`);
  }
  if (!payload.result || !payload.result.task) {
    throw new Error(`${label} must include result.task`);
  }

  const task = payload.result.task;
  if (task.status?.state !== "TASK_STATE_COMPLETED") {
    throw new Error(`${label} task.status.state must equal TASK_STATE_COMPLETED, got ${task.status?.state}`);
  }

  const visibleText = collectTextParts(task).join("\n");
  for (const required of requiredStrings) {
    if (!visibleText.includes(required)) {
      throw new Error(`${label} visible task text missing required string: ${required}`);
    }
  }

  console.log(`${label}: protocol PASS`);
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
NODE
}

classify_browser_failure_timing() {
  local runtime_delta_file="${REPORTS_DIR}/runtime-log-delta.json"
  if [[ ! -f "${runtime_delta_file}" ]]; then
    printf '%s\n' "before_runtime_post"
    return
  fi

  node - "${runtime_delta_file}" <<'NODE'
const fs = require("node:fs");

const payload = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const entries = Object.values(payload || {});
const requestCount = entries.reduce((sum, entry) => sum + Number(entry?.a2a_request_count || 0), 0);
process.stdout.write(requestCount > 0 ? "after_runtime_post\n" : "before_runtime_post\n");
NODE
}

echo "[live-a2a-proof] run_id=${RUN_ID}"
echo "[live-a2a-proof] branch=${BRANCH_NAME} commit=${COMMIT_SHA}"
echo "[live-a2a-proof] note: no repo-supported tunnel boot script was found; active public URLs are required"

run_logged "Link shared env" "01-link-shared-env" "${SCRIPT_DIR}/link-shared-env.sh"
load_repo_env

if [[ "${PROMPT_OPINION_REQUIRE_GOOGLE_PROVIDER:-0}" == "1" ]]; then
  run_logged "Check runtime provider config" "02-check-runtime-provider-config" env CLINICAL_INTELLIGENCE_LLM_PROVIDER=google "${SCRIPT_DIR}/check-runtime-provider-config.sh"
else
  run_logged "Check runtime provider config" "02-check-runtime-provider-config" "${SCRIPT_DIR}/check-runtime-provider-config.sh"
fi

run_logged "Start local MCP runtimes" "03-start-two-mcp-local" "${SCRIPT_DIR}/start-two-mcp-local.sh"
run_logged "Check two-MCP readiness" "04-check-two-mcp-readiness" "${SCRIPT_DIR}/check-two-mcp-readiness.sh"

check_local_mcp_ready "${LOCAL_DGK_BASE_URL}/readyz" "Discharge Gatekeeper MCP" "${REPORTS_DIR}/local-dgk-readyz.json" "0"
local_dgk_ready=true

check_local_mcp_ready "${LOCAL_CI_BASE_URL}/readyz" "Clinical Intelligence MCP" "${REPORTS_DIR}/local-ci-readyz.json" "${PROMPT_OPINION_REQUIRE_GOOGLE_PROVIDER:-0}"
local_ci_ready=true

run_logged "Start local A2A runtime" "05-start-a2a-local" "${SCRIPT_DIR}/start-a2a-local.sh"
run_logged "Check A2A readiness" "06-check-a2a-readiness" env DISCHARGE_GATEKEEPER_MCP_URL="${EXPECTED_LOCAL_DGK_MCP_URL}" CLINICAL_INTELLIGENCE_MCP_URL="${EXPECTED_LOCAL_CI_MCP_URL}" "${SCRIPT_DIR}/check-a2a-readiness.sh"

check_local_a2a_ready \
  "${REPORTS_DIR}/local-a2a-readyz.json" \
  "${REPORTS_DIR}/local-a2a-agent-card.json" \
  "${REPORTS_DIR}/local-a2a-tasks.json"
local_a2a_ready=true

require_env_var "PROMPT_OPINION_DGK_PUBLIC_URL"
require_env_var "PROMPT_OPINION_CI_PUBLIC_URL"
require_env_var "PROMPT_OPINION_A2A_PUBLIC_URL"

curl_http_200 \
  "$(normalize_readyz_url "${PROMPT_OPINION_DGK_PUBLIC_URL}")" \
  "${REPORTS_DIR}/public-dgk-readyz.json" \
  "public DGK /readyz"
public_dgk_ready=true

curl_http_200 \
  "$(normalize_readyz_url "${PROMPT_OPINION_CI_PUBLIC_URL}")" \
  "${REPORTS_DIR}/public-ci-readyz.json" \
  "public CI /readyz"
public_ci_ready=true

check_public_a2a_ready \
  "${REPORTS_DIR}/public-a2a-readyz.json" \
  "${REPORTS_DIR}/public-a2a-agent-card.json" \
  "${REPORTS_DIR}/public-a2a-tasks.json"
public_a2a_ready=true

protocol_preflight \
  "$(trim_trailing_slash "${LOCAL_A2A_BASE_URL}")/message:send/v1/message:send" \
  "${LOCAL_PROTOCOL_RESPONSE_FILE}" \
  "local-a2a"
local_result_task=true

protocol_preflight \
  "$(trim_trailing_slash "${PROMPT_OPINION_A2A_PUBLIC_URL}")/message:send/v1/message:send" \
  "${PUBLIC_PROTOCOL_RESPONSE_FILE}" \
  "public-a2a"
public_result_task=true

if run_logged \
  "Run Prompt Opinion browser proof (A2A only)" \
  "07-run-prompt-opinion-browser-proof" \
  env \
    PROMPT_OPINION_E2E_RUN_ID="${RUN_ID}" \
    PROMPT_OPINION_E2E_RUN_DIR="${RUN_DIR}" \
    PROMPT_OPINION_BROWSER_LANES="a2a_main" \
    PROMPT_OPINION_A2A_VARIANTS="vc" \
    PROMPT_OPINION_REQUIRE_GOOGLE_PROVIDER="1" \
    "${SCRIPT_DIR}/run-prompt-opinion-browser-proof.sh"; then
  browser_proof_status="passed"
else
  browser_proof_status="failed"
  browser_failure_timing="$(classify_browser_failure_timing)"
  exit 1
fi
