#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PO_COMMUNITY_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PID_DIR="${PO_COMMUNITY_ROOT}/.pids"
mkdir -p "${PID_DIR}"

DISCHARGE_GATEKEEPER_HOST="${DISCHARGE_GATEKEEPER_HOST:-127.0.0.1}"
DISCHARGE_GATEKEEPER_PORT="${DISCHARGE_GATEKEEPER_PORT:-5055}"
CLINICAL_INTELLIGENCE_HOST="${CLINICAL_INTELLIGENCE_HOST:-127.0.0.1}"
CLINICAL_INTELLIGENCE_PORT="${CLINICAL_INTELLIGENCE_PORT:-5056}"
EXTERNAL_A2A_HOST="${EXTERNAL_A2A_HOST:-127.0.0.1}"
EXTERNAL_A2A_PORT="${EXTERNAL_A2A_PORT:-5057}"

wait_for_health() {
  local endpoint="$1"
  local label="$2"
  local deadline=30

  for ((i = 0; i < deadline; i++)); do
    if curl -sSf "${endpoint}" >/dev/null 2>&1; then
      echo "[start-a2a-local] ${label} is healthy at ${endpoint}"
      return 0
    fi
    sleep 1
  done

  echo "[start-a2a-local] ${label} failed health check at ${endpoint}" >&2
  return 1
}

two_mcp_ready() {
  curl -sSf "http://${DISCHARGE_GATEKEEPER_HOST}:${DISCHARGE_GATEKEEPER_PORT}/readyz" >/dev/null 2>&1 &&
    curl -sSf "http://${CLINICAL_INTELLIGENCE_HOST}:${CLINICAL_INTELLIGENCE_PORT}/readyz" >/dev/null 2>&1
}

if ! two_mcp_ready; then
  echo "[start-a2a-local] two MCP runtimes are not running; booting them first"
  "${SCRIPT_DIR}/start-two-mcp-local.sh"
else
  echo "[start-a2a-local] reusing healthy two-MCP runtimes"
fi

if [[ -f "${PID_DIR}/external-a2a.pid" ]]; then
  existing_pid="$(cat "${PID_DIR}/external-a2a.pid")"
  if kill -0 "${existing_pid}" >/dev/null 2>&1; then
    echo "[start-a2a-local] external A2A already running (pid=${existing_pid})"
    exit 0
  fi
fi

pushd "${PO_COMMUNITY_ROOT}/external-a2a-orchestrator-typescript" >/dev/null

HOST="${EXTERNAL_A2A_HOST}" \
PORT="${EXTERNAL_A2A_PORT}" \
PO_ENV="${PO_ENV:-local}" \
DISCHARGE_GATEKEEPER_MCP_URL="http://${DISCHARGE_GATEKEEPER_HOST}:${DISCHARGE_GATEKEEPER_PORT}/mcp" \
CLINICAL_INTELLIGENCE_MCP_URL="http://${CLINICAL_INTELLIGENCE_HOST}:${CLINICAL_INTELLIGENCE_PORT}/mcp" \
npm run start >"${PID_DIR}/external-a2a.log" 2>&1 &

echo $! > "${PID_DIR}/external-a2a.pid"
popd >/dev/null

wait_for_health "http://${EXTERNAL_A2A_HOST}:${EXTERNAL_A2A_PORT}/readyz" "external A2A orchestrator"

echo "[start-a2a-local] external A2A started on ${EXTERNAL_A2A_HOST}:${EXTERNAL_A2A_PORT} (pid=$(cat "${PID_DIR}/external-a2a.pid"))"
echo "[start-a2a-local] log file: ${PID_DIR}/external-a2a.log"
