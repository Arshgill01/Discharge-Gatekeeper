#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PO_COMMUNITY_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cleanup() {
  "${SCRIPT_DIR}/stop-two-mcp-local.sh" >/dev/null 2>&1 || true
}

trap cleanup EXIT

echo "[two-mcp-smoke] running runtime registration smokes"
npm --prefix "${PO_COMMUNITY_ROOT}/typescript" run smoke:runtime
npm --prefix "${PO_COMMUNITY_ROOT}/clinical-intelligence-typescript" run smoke:runtime

echo "[two-mcp-smoke] booting both MCP runtimes"
"${SCRIPT_DIR}/start-two-mcp-local.sh"

echo "[two-mcp-smoke] checking two-MCP readiness surfaces"
"${SCRIPT_DIR}/check-two-mcp-readiness.sh"

echo "[two-mcp-smoke] running phase-2 integration assertions"
npm --prefix "${PO_COMMUNITY_ROOT}/clinical-intelligence-typescript" run smoke:phase2-two-mcp

echo "[two-mcp-smoke] PASS"
