import assert from "node:assert/strict";
import { assessDischargeReadinessV1 } from "../discharge-readiness/assess-discharge-readiness";
import type { BlockerPriority } from "../discharge-readiness/contract";
import { FIRST_SYNTHETIC_SCENARIO_V1 } from "../discharge-readiness/scenario-v1";
import { SCENARIO_V1_TRUTH } from "../discharge-readiness/scenario-truth";

const PROMPT_1 = "Is this patient safe to discharge today?";
const PROMPT_2 = "What exactly is blocking discharge right now?";
const PROMPT_3 = "What must happen before this patient leaves?";

const response = assessDischargeReadinessV1(FIRST_SYNTHETIC_SCENARIO_V1);

assert.equal(
  response.verdict,
  SCENARIO_V1_TRUTH.verdict,
  "Prompt 1: verdict drifted from the primary demo scenario truth.",
);
assert.match(
  response.summary,
  /Verdict: NOT READY/,
  "Prompt 1: summary must mirror the not_ready verdict.",
);
assert.ok(
  response.summary.includes("clinician review") || response.summary.includes("care team"),
  "Prompt 1: summary should remain assistive and clinician-anchored.",
);

const blockerCategories = new Set(response.blockers.map((blocker) => blocker.category));
for (const requiredCategory of SCENARIO_V1_TRUTH.required_categories) {
  assert.ok(
    blockerCategories.has(requiredCategory),
    `Prompt 2: missing expected blocker category '${requiredCategory}'.`,
  );
}
for (const forbiddenCategory of SCENARIO_V1_TRUTH.forbidden_categories) {
  assert.ok(
    !blockerCategories.has(forbiddenCategory),
    `Prompt 2: unexpected blocker category '${forbiddenCategory}' is present.`,
  );
}

const blockerPriorities: Record<BlockerPriority, number> = {
  high: 0,
  medium: 0,
  low: 0,
};
for (const blocker of response.blockers) {
  blockerPriorities[blocker.priority] += 1;
  assert.ok(
    blocker.actionability.trim().length > 0,
    `Prompt 2: blocker ${blocker.id} must keep actionable remediation text.`,
  );
  assert.ok(
    blocker.evidence.length > 0,
    `Prompt 2: blocker ${blocker.id} must keep at least one evidence ID.`,
  );
}
for (const [priority, expectedCount] of Object.entries(SCENARIO_V1_TRUTH.priority_counts)) {
  const typedPriority = priority as BlockerPriority;
  assert.equal(
    blockerPriorities[typedPriority],
    expectedCount,
    `Prompt 2: expected ${expectedCount} ${priority} blockers in primary demo scenario.`,
  );
}

assert.equal(
  response.next_steps.length,
  response.blockers.length,
  "Prompt 3: next_steps must remain one-to-one with blockers.",
);
const blockerIds = new Set(response.blockers.map((blocker) => blocker.id));
for (const step of response.next_steps) {
  assert.ok(step.owner.trim().length > 0, `Prompt 3: next step ${step.id} must include an owner.`);
  assert.equal(
    step.linked_blockers.length,
    1,
    `Prompt 3: next step ${step.id} must link to exactly one blocker.`,
  );
  const linkedBlockerId = step.linked_blockers[0];
  assert.ok(
    linkedBlockerId && blockerIds.has(linkedBlockerId),
    `Prompt 3: next step ${step.id} links unknown blocker '${linkedBlockerId}'.`,
  );
}

console.log("SMOKE PASS: demo path (3 prompts)");
console.log(
  JSON.stringify(
    {
      prompts: [PROMPT_1, PROMPT_2, PROMPT_3],
      verdict: response.verdict,
      blocker_count: response.blockers.length,
      evidence_count: response.evidence.length,
      next_step_count: response.next_steps.length,
    },
    null,
    2,
  ),
);
