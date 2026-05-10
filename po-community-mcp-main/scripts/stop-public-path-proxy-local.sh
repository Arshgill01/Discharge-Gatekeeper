#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PO_COMMUNITY_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RUNTIME_DIR="${PO_COMMUNITY_ROOT}/.runtime/path-proxy"
PID_FILE="${RUNTIME_DIR}/path-proxy.pid"

if [[ ! -f "${PID_FILE}" ]]; then
  echo "[path-proxy] no pid file found"
  exit 0
fi

pid="$(cat "${PID_FILE}")"
if kill -0 "${pid}" >/dev/null 2>&1; then
  kill "${pid}"
  echo "[path-proxy] stopped pid ${pid}"
else
  echo "[path-proxy] pid ${pid} is not running"
fi

rm -f "${PID_FILE}"
