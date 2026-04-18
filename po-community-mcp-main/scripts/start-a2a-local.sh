#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PO_COMMUNITY_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PID_DIR="${PO_COMMUNITY_ROOT}/.pids"
mkdir -p "${PID_DIR}"

DISCHARGE_GATEKEEPER_PORT="${DISCHARGE_GATEKEEPER_PORT:-5055}"
CLINICAL_INTELLIGENCE_PORT="${CLINICAL_INTELLIGENCE_PORT:-5056}"
EXTERNAL_A2A_PORT="${EXTERNAL_A2A_PORT:-5057}"

if [[ ! -f "${PID_DIR}/discharge-gatekeeper.pid" || ! -f "${PID_DIR}/clinical-intelligence.pid" ]]; then
  echo "[start-a2a-local] two MCP runtimes are not running; booting them first"
  "${SCRIPT_DIR}/start-two-mcp-local.sh"
fi

if [[ -f "${PID_DIR}/external-a2a.pid" ]]; then
  existing_pid="$(cat "${PID_DIR}/external-a2a.pid")"
  if kill -0 "${existing_pid}" >/dev/null 2>&1; then
    echo "[start-a2a-local] external A2A already running (pid=${existing_pid})"
    exit 0
  fi
fi

pushd "${PO_COMMUNITY_ROOT}/external-a2a-orchestrator-typescript" >/dev/null

PORT="${EXTERNAL_A2A_PORT}" \
DISCHARGE_GATEKEEPER_MCP_URL="http://127.0.0.1:${DISCHARGE_GATEKEEPER_PORT}/mcp" \
CLINICAL_INTELLIGENCE_MCP_URL="http://127.0.0.1:${CLINICAL_INTELLIGENCE_PORT}/mcp" \
npm run start >"${PID_DIR}/external-a2a.log" 2>&1 &

echo $! > "${PID_DIR}/external-a2a.pid"
popd >/dev/null

sleep 1

echo "[start-a2a-local] external A2A started on :${EXTERNAL_A2A_PORT} (pid=$(cat "${PID_DIR}/external-a2a.pid"))"
echo "[start-a2a-local] log file: ${PID_DIR}/external-a2a.log"
