#!/usr/bin/env bash
set -euo pipefail

DISCHARGE_GATEKEEPER_BASE_URL="${DISCHARGE_GATEKEEPER_BASE_URL:-http://127.0.0.1:5055}"
CLINICAL_INTELLIGENCE_BASE_URL="${CLINICAL_INTELLIGENCE_BASE_URL:-http://127.0.0.1:5056}"

check_surface() {
  local base_url="$1"
  local expected_name="$2"
  local expected_tools_csv="$3"

  local payload
  payload="$(curl -sSf "${base_url}/readyz")"

  node -e '
const payload = JSON.parse(process.argv[1]);
const expectedName = process.argv[2];
const expectedTools = process.argv[3].split(",").filter(Boolean);

if (payload.status !== "ok") {
  throw new Error(`status must be ok, got: ${payload.status}`);
}
if (payload.server_name !== expectedName) {
  throw new Error(`server_name mismatch: expected ${expectedName}, got ${payload.server_name}`);
}
if (!Array.isArray(payload.tools)) {
  throw new Error("tools must be an array");
}
for (const tool of expectedTools) {
  if (!payload.tools.includes(tool)) {
    throw new Error(`missing expected tool: ${tool}`);
  }
}
console.log(`READY PASS: ${expectedName} (${payload.tools.length} tools)`);
' "${payload}" "${expected_name}" "${expected_tools_csv}"
}

check_surface \
  "${DISCHARGE_GATEKEEPER_BASE_URL}" \
  "Discharge Gatekeeper MCP" \
  "assess_discharge_readiness,extract_discharge_blockers,generate_transition_plan,build_clinician_handoff_brief,draft_patient_discharge_instructions"

check_surface \
  "${CLINICAL_INTELLIGENCE_BASE_URL}" \
  "Clinical Intelligence MCP" \
  "assess_reconciled_discharge_readiness,surface_hidden_risks,synthesize_transition_narrative"
