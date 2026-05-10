#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

OVERRIDE_ENV_VARS=(
  PROMPT_OPINION_E2E_RUN_ID
  PROMPT_OPINION_E2E_RUN_DIR
  PROMPT_OPINION_BROWSER_PROFILE_DIR
  PROMPT_OPINION_UPDATE_REGISTRATIONS
  PROMPT_OPINION_DGK_PUBLIC_URL
  PROMPT_OPINION_CI_PUBLIC_URL
  PROMPT_OPINION_A2A_PUBLIC_URL
  PROMPT_OPINION_DGK_LOG
  PROMPT_OPINION_CI_LOG
  PROMPT_OPINION_A2A_LOG
  PROMPT_OPINION_DIRECT_PROMPTS
  PROMPT_OPINION_BROWSER_LANES
  PROMPT_OPINION_A2A_VARIANTS
  PROMPT_OPINION_REQUIRE_GOOGLE_PROVIDER
)

for name in "${OVERRIDE_ENV_VARS[@]}"; do
  export "${name}=caller-${name}"
done

env_output="$(
  PROMPT_OPINION_BROWSER_PROOF_PRINT_ENV_AND_EXIT=1 \
    "${SCRIPT_DIR}/run-prompt-opinion-browser-proof.sh"
)"

for name in "${OVERRIDE_ENV_VARS[@]}"; do
  expected="${name}=caller-${name}"
  if ! grep -Fqx "${expected}" <<<"${env_output}"; then
    echo "missing preserved override: ${expected}" >&2
    echo "${env_output}" >&2
    exit 1
  fi
done

node --input-type=module <<'NODE'
import assert from "node:assert/strict";
import {
  selectA2AVariants,
  summarizeVisibleA2AClinicalPayload,
  summarizeVisibleRuntimeDiagnostics,
} from "./po-community-mcp-main/scripts/prompt-opinion-browser-proof-harness-lib.mjs";

const variants = [
  { id: "A", attemptId: "A2A-VA-01" },
  { id: "C", attemptId: "A2A-VC-01" },
];

assert.deepEqual(selectA2AVariants(variants, "vc").map((variant) => variant.id), ["C"]);

const visibleText = `ARTIFACT_MESSAGES: {"final_verdict":"ready_with_caveats","runtime_diagnostics":{"request_id":"req-1","task_id":"task-1","execution_finished_at":"2026-05-05T19:27:49.593Z","incoming_request":{"request_path":"/message:send/v1/message:send","correlation_id":"corr-1"},"downstream_correlation":[{"component":"discharge_gatekeeper_mcp"},{"component":"clinical_intelligence_mcp"}],"downstream_calls":[{"component":"discharge_gatekeeper_mcp","request_id":"req-1"},{"component":"clinical_intelligence_mcp","request_id":"req-1"}]}}`;

const summary = summarizeVisibleRuntimeDiagnostics(visibleText);
assert.equal(summary.a2a_route_evidence_source, "runtime_diagnostics_visible_fallback");
assert.equal(summary.a2a_request_count, 1);
assert.deepEqual(summary.a2a_request_ids, ["req-1"]);
assert.deepEqual(summary.a2a_task_ids, ["task-1"]);
assert.deepEqual(summary.a2a_paths, ["/message:send/v1/message:send"]);
assert.equal(summary.both_mcps_hit, true);

const yellowPayload = summarizeVisibleA2AClinicalPayload(visibleText);
assert.equal(yellowPayload.final_verdict, "ready_with_caveats");
assert.equal(yellowPayload.clinical_green_criteria_passed, false);

const greenPayload = summarizeVisibleA2AClinicalPayload(`ARTIFACT_MESSAGES: {"final_verdict":"not_ready","hidden_risk_result":"hidden_risk_present","citations":{"hidden_risk":[{"source":"Nursing Note"}]}}`);
assert.equal(greenPayload.clinical_green_criteria_passed, true);
NODE

echo "browser proof harness smoke tests passed"
