#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PO_COMMUNITY_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${PO_COMMUNITY_ROOT}/.." && pwd)"
RUNTIME_DIR="${PO_COMMUNITY_ROOT}/.runtime/two-mcp"

mkdir -p "${RUNTIME_DIR}"

if [[ -f "${REPO_ROOT}/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${REPO_ROOT}/.env.local"
  set +a
fi

DISCHARGE_GATEKEEPER_HOST="${DISCHARGE_GATEKEEPER_HOST:-127.0.0.1}"
DISCHARGE_GATEKEEPER_PORT="${DISCHARGE_GATEKEEPER_PORT:-5055}"
CLINICAL_INTELLIGENCE_HOST="${CLINICAL_INTELLIGENCE_HOST:-127.0.0.1}"
CLINICAL_INTELLIGENCE_PORT="${CLINICAL_INTELLIGENCE_PORT:-5056}"

DISCHARGE_GATEKEEPER_ALLOWED_HOSTS="${DISCHARGE_GATEKEEPER_ALLOWED_HOSTS:-localhost,127.0.0.1}"
CLINICAL_INTELLIGENCE_ALLOWED_HOSTS="${CLINICAL_INTELLIGENCE_ALLOWED_HOSTS:-localhost,127.0.0.1}"

CLINICAL_INTELLIGENCE_LLM_PROVIDER="${CLINICAL_INTELLIGENCE_LLM_PROVIDER:-heuristic}"
CLINICAL_INTELLIGENCE_LLM_TIMEOUT_MS="${CLINICAL_INTELLIGENCE_LLM_TIMEOUT_MS:-12000}"

wait_for_health() {
  local endpoint="$1"
  local label="$2"
  local deadline=30

  for ((i = 0; i < deadline; i++)); do
    if curl -sSf "${endpoint}" >/dev/null 2>&1; then
      echo "[two-mcp] ${label} is healthy at ${endpoint}"
      return 0
    fi
    sleep 1
  done

  echo "[two-mcp] ${label} failed health check at ${endpoint}" >&2
  return 1
}

start_server() {
  local server_key="$1"
  local working_dir="$2"
  local log_file="$3"
  local pid_file="$4"
  shift 4

  if [[ -f "${pid_file}" ]]; then
    local existing_pid
    existing_pid="$(cat "${pid_file}")"
    if kill -0 "${existing_pid}" >/dev/null 2>&1; then
      echo "[two-mcp] ${server_key} already running with pid ${existing_pid}"
      return 0
    fi
  fi

  (
    cd "${working_dir}"
    env "$@" npm run start >"${log_file}" 2>&1 &
    echo $! >"${pid_file}"
  )

  echo "[two-mcp] started ${server_key}; pid $(cat "${pid_file}")"
}

start_server \
  "discharge-gatekeeper" \
  "${PO_COMMUNITY_ROOT}/typescript" \
  "${RUNTIME_DIR}/discharge-gatekeeper.log" \
  "${RUNTIME_DIR}/discharge-gatekeeper.pid" \
  HOST="${DISCHARGE_GATEKEEPER_HOST}" \
  PORT="${DISCHARGE_GATEKEEPER_PORT}" \
  PO_ENV="local" \
  MCP_SERVER_NAME="Discharge Gatekeeper MCP" \
  ALLOWED_HOSTS="${DISCHARGE_GATEKEEPER_ALLOWED_HOSTS}"

start_server \
  "clinical-intelligence" \
  "${PO_COMMUNITY_ROOT}/clinical-intelligence-typescript" \
  "${RUNTIME_DIR}/clinical-intelligence.log" \
  "${RUNTIME_DIR}/clinical-intelligence.pid" \
  HOST="${CLINICAL_INTELLIGENCE_HOST}" \
  PORT="${CLINICAL_INTELLIGENCE_PORT}" \
  PO_ENV="local" \
  MCP_SERVER_NAME="Clinical Intelligence MCP" \
  ALLOWED_HOSTS="${CLINICAL_INTELLIGENCE_ALLOWED_HOSTS}" \
  CLINICAL_INTELLIGENCE_LLM_PROVIDER="${CLINICAL_INTELLIGENCE_LLM_PROVIDER}" \
  CLINICAL_INTELLIGENCE_LLM_TIMEOUT_MS="${CLINICAL_INTELLIGENCE_LLM_TIMEOUT_MS}" \
  CLINICAL_INTELLIGENCE_GOOGLE_MODEL="${CLINICAL_INTELLIGENCE_GOOGLE_MODEL:-gemma-4-31B-it}" \
  GOOGLE_API_KEY="${GOOGLE_API_KEY:-}" \
  GEMINI_API_KEY="${GEMINI_API_KEY:-}"

wait_for_health "http://${DISCHARGE_GATEKEEPER_HOST}:${DISCHARGE_GATEKEEPER_PORT}/healthz" "Discharge Gatekeeper MCP"
wait_for_health "http://${CLINICAL_INTELLIGENCE_HOST}:${CLINICAL_INTELLIGENCE_PORT}/healthz" "Clinical Intelligence MCP"

echo "[two-mcp] logs:"
echo "  ${RUNTIME_DIR}/discharge-gatekeeper.log"
echo "  ${RUNTIME_DIR}/clinical-intelligence.log"
