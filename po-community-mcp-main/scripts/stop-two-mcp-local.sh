#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PO_COMMUNITY_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RUNTIME_DIR="${PO_COMMUNITY_ROOT}/.runtime/two-mcp"

stop_pid_file() {
  local pid_file="$1"
  local label="$2"

  if [[ ! -f "${pid_file}" ]]; then
    echo "[two-mcp] ${label}: not running (no pid file)"
    return 0
  fi

  local pid
  pid="$(cat "${pid_file}")"
  if kill -0 "${pid}" >/dev/null 2>&1; then
    kill "${pid}" >/dev/null 2>&1 || true
    echo "[two-mcp] ${label}: stopped pid ${pid}"
  else
    echo "[two-mcp] ${label}: stale pid ${pid}"
  fi

  rm -f "${pid_file}"
}

stop_pid_file "${RUNTIME_DIR}/discharge-gatekeeper.pid" "Discharge Gatekeeper MCP"
stop_pid_file "${RUNTIME_DIR}/clinical-intelligence.pid" "Clinical Intelligence MCP"
