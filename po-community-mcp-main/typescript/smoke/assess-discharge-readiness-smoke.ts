import assert from "node:assert/strict";
import { assessDischargeReadinessV1 } from "../discharge-readiness/assess-discharge-readiness";
import { BlockerCategory } from "../discharge-readiness/contract";
import { FIRST_SYNTHETIC_SCENARIO_V1 } from "../discharge-readiness/scenario-v1";

const response = assessDischargeReadinessV1(FIRST_SYNTHETIC_SCENARIO_V1);

assert.equal(response.verdict, "not_ready");
assert.ok(response.blockers.length >= 4, "Expected at least four blockers.");

const blockerCategories = new Set(response.blockers.map((blocker) => blocker.category));
const expectedCategories: BlockerCategory[] = [
  "clinical",
  "medications",
  "follow_up",
  "education",
  "home_support",
  "logistics",
];

for (const category of expectedCategories) {
  assert.ok(blockerCategories.has(category), `Missing blocker category: ${category}`);
}

const evidenceIds = new Set(response.evidence.map((trace) => trace.id));
for (const blocker of response.blockers) {
  assert.ok(blocker.evidence.length > 0, `Blocker ${blocker.id} missing evidence.`);
  for (const evidenceId of blocker.evidence) {
    assert.ok(
      evidenceIds.has(evidenceId),
      `Blocker ${blocker.id} references unknown evidence ${evidenceId}.`,
    );
  }
}

assert.equal(response.next_steps.length, response.blockers.length);
assert.ok(response.summary.length > 0);

console.log("SMOKE PASS: assess_discharge_readiness v1");
console.log(
  JSON.stringify(
    {
      verdict: response.verdict,
      blocker_count: response.blockers.length,
      evidence_count: response.evidence.length,
      next_step_count: response.next_steps.length,
    },
    null,
    2,
  ),
);
