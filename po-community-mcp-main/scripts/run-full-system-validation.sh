#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PO_COMMUNITY_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

run_step() {
  local label="$1"
  shift

  echo
  echo "[system-validation] ${label}"
  "$@"
}

echo "[system-validation] running Care Transitions Command backend/runtime validation"
echo "[system-validation] note: lifecycle wrappers are stateful and must run sequentially, not in parallel"

run_step \
  "Discharge Gatekeeper MCP release gate" \
  npm --prefix "${PO_COMMUNITY_ROOT}/typescript" run smoke:release-gate

run_step \
  "Clinical Intelligence MCP release gate" \
  npm --prefix "${PO_COMMUNITY_ROOT}/clinical-intelligence-typescript" run smoke:release-gate

run_step \
  "external A2A orchestrator release gate" \
  npm --prefix "${PO_COMMUNITY_ROOT}/external-a2a-orchestrator-typescript" run smoke:release-gate

run_step \
  "two-MCP integration wrapper" \
  "${SCRIPT_DIR}/smoke-two-mcp-integration.sh"

run_step \
  "A2A orchestration wrapper" \
  "${SCRIPT_DIR}/smoke-a2a-orchestration.sh"

echo
echo "[system-validation] PASS"
