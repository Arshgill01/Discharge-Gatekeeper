#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PO_COMMUNITY_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cleanup() {
  "${SCRIPT_DIR}/stop-a2a-local.sh" >/dev/null 2>&1 || true
  "${SCRIPT_DIR}/stop-two-mcp-local.sh" >/dev/null 2>&1 || true
}

trap cleanup EXIT

echo "[a2a-smoke] running MCP runtime registration smokes"
npm --prefix "${PO_COMMUNITY_ROOT}/typescript" run smoke:runtime
npm --prefix "${PO_COMMUNITY_ROOT}/clinical-intelligence-typescript" run smoke:runtime

echo "[a2a-smoke] running external A2A runtime smoke"
npm --prefix "${PO_COMMUNITY_ROOT}/external-a2a-orchestrator-typescript" run smoke:runtime

echo "[a2a-smoke] booting runtimes"
"${SCRIPT_DIR}/start-a2a-local.sh"

echo "[a2a-smoke] checking readiness surfaces"
"${SCRIPT_DIR}/check-two-mcp-readiness.sh"
"${SCRIPT_DIR}/check-a2a-readiness.sh"

echo "[a2a-smoke] running decision-matrix and orchestration checks"
npm --prefix "${PO_COMMUNITY_ROOT}/external-a2a-orchestrator-typescript" run smoke:decision-matrix
ORCHESTRATOR_SMOKE_DG_PORT=5155 \
ORCHESTRATOR_SMOKE_CI_PORT=5156 \
ORCHESTRATOR_SMOKE_A2A_PORT=5157 \
ORCHESTRATOR_SMOKE_A2A_FALLBACK_PORT=5158 \
  npm --prefix "${PO_COMMUNITY_ROOT}/external-a2a-orchestrator-typescript" run smoke:orchestrator
ORCHESTRATOR_SMOKE_DG_PORT=5165 \
ORCHESTRATOR_SMOKE_CI_PORT=5166 \
ORCHESTRATOR_SMOKE_A2A_PORT=5167 \
  npm --prefix "${PO_COMMUNITY_ROOT}/external-a2a-orchestrator-typescript" run smoke:prompt-opinion-compatibility

echo "[a2a-smoke] PASS"
