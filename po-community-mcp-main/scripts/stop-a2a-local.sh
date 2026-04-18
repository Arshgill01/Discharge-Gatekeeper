#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PO_COMMUNITY_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PID_DIR="${PO_COMMUNITY_ROOT}/.pids"

if [[ -f "${PID_DIR}/external-a2a.pid" ]]; then
  pid="$(cat "${PID_DIR}/external-a2a.pid")"
  if kill -0 "${pid}" >/dev/null 2>&1; then
    kill "${pid}" >/dev/null 2>&1 || true
    echo "[stop-a2a-local] stopped external A2A (pid=${pid})"
  fi
  rm -f "${PID_DIR}/external-a2a.pid"
else
  echo "[stop-a2a-local] external A2A pid file not found"
fi
