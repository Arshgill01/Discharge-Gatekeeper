import assert from "node:assert/strict";
import { assessDischargeReadinessV1 } from "../discharge-readiness/assess-discharge-readiness";
import {
  BlockerCategory,
  BlockerPriority,
  V1_BLOCKER_CATEGORIES,
} from "../discharge-readiness/contract";
import { FIRST_SYNTHETIC_SCENARIO_V1 } from "../discharge-readiness/scenario-v1";

const response = assessDischargeReadinessV1(FIRST_SYNTHETIC_SCENARIO_V1);

const priorityWeight: Record<BlockerPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

assert.equal(response.verdict, "not_ready");
assert.ok(response.blockers.length >= 4, "Expected at least four blockers.");
assert.match(response.summary, /^Verdict: /, "Summary should start with a verdict label.");
assert.match(
  response.summary,
  /Verdict: NOT READY/,
  "Summary should clearly mirror the not_ready verdict.",
);

const blockerCategories = new Set(response.blockers.map((blocker) => blocker.category));
const allowedCategories = new Set(V1_BLOCKER_CATEGORIES);
for (const category of blockerCategories) {
  assert.ok(
    allowedCategories.has(category),
    `Unexpected blocker category outside canonical taxonomy: ${category}`,
  );
}

const expectedCategories: BlockerCategory[] = [
  "clinical_stability",
  "medication_reconciliation",
  "follow_up_and_referrals",
  "patient_education",
  "home_support_and_services",
  "equipment_and_transport",
];

for (const category of expectedCategories) {
  assert.ok(blockerCategories.has(category), `Missing blocker category: ${category}`);
}

for (let i = 1; i < response.blockers.length; i++) {
  const previous = response.blockers[i - 1];
  const current = response.blockers[i];
  assert.ok(previous, "Previous blocker should exist.");
  assert.ok(current, "Current blocker should exist.");
  assert.ok(
    priorityWeight[previous.priority] >= priorityWeight[current.priority],
    "Blockers should be sorted by descending priority.",
  );
}

const blockerById = new Map(response.blockers.map((blocker) => [blocker.id, blocker]));
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

for (const trace of response.evidence) {
  assert.ok(trace.supports_blockers.length > 0, `Evidence ${trace.id} has no linked blockers.`);
  for (const blockerId of trace.supports_blockers) {
    const blocker = blockerById.get(blockerId);
    assert.ok(blocker, `Evidence ${trace.id} references unknown blocker ${blockerId}.`);
    assert.ok(
      blocker.evidence.includes(trace.id),
      `Evidence ${trace.id} should be back-linked from blocker ${blockerId}.`,
    );
  }
}

assert.equal(response.next_steps.length, response.blockers.length);
for (const step of response.next_steps) {
  assert.equal(
    step.linked_blockers.length,
    1,
    `Next step ${step.id} should link to exactly one blocker in v1.`,
  );

  const linkedBlockerId = step.linked_blockers[0];
  assert.ok(linkedBlockerId, `Next step ${step.id} is missing linked blocker id.`);
  const blocker = blockerById.get(linkedBlockerId);
  assert.ok(blocker, `Next step ${step.id} references unknown blocker ${linkedBlockerId}.`);
  assert.equal(
    step.priority,
    blocker.priority,
    `Next step ${step.id} priority should match blocker ${linkedBlockerId}.`,
  );
  assert.ok(step.action.length > 0, `Next step ${step.id} is missing an action.`);
  assert.ok(step.owner.length > 0, `Next step ${step.id} is missing an owner.`);
}

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
