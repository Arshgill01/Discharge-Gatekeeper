import assert from "node:assert/strict";
import { assessDischargeReadinessV1 } from "../discharge-readiness/assess-discharge-readiness";
import type { BlockerPriority } from "../discharge-readiness/contract";
import { FIRST_SYNTHETIC_SCENARIO_V1 } from "../discharge-readiness/scenario-v1";
import { SCENARIO_V1_TRUTH } from "../discharge-readiness/scenario-truth";
import {
  buildClinicianHandoffBriefV1,
  draftPatientDischargeInstructionsV1,
} from "../discharge-readiness/workflow-artifacts";

const PROMPT_1 = "Is this patient safe to discharge today?";
const PROMPT_2 = "What exactly is blocking discharge right now?";
const PROMPT_3 = "What must happen before this patient leaves?";
const PROMPT_4 = "Build the clinician handoff brief.";
const PROMPT_5 = "Draft patient discharge instructions.";

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
  assert.ok(
    blocker.provenance.summary.trim().length > 0,
    `Prompt 2: blocker ${blocker.id} must expose a bounded provenance summary.`,
  );
  assert.ok(
    blocker.provenance.summary.length <= 160,
    `Prompt 2: blocker ${blocker.id} provenance summary should stay demo-readable.`,
  );
  assert.ok(
    blocker.provenance.source_labels.length > 0,
    `Prompt 2: blocker ${blocker.id} must expose source labels.`,
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
  assert.ok(
    step.trace_summary.length <= 160,
    `Prompt 3: next step ${step.id} trace summary should stay demo-readable.`,
  );
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
  assert.ok(
    step.linked_evidence.length > 0,
    `Prompt 3: next step ${step.id} must carry linked evidence.`,
  );
}

const clinicianHandoff = buildClinicianHandoffBriefV1(FIRST_SYNTHETIC_SCENARIO_V1);
assert.equal(
  clinicianHandoff.readiness_verdict,
  response.verdict,
  "Prompt 4: clinician handoff verdict must match Prompt 1 readiness verdict.",
);
assert.equal(
  clinicianHandoff.unresolved_risks.length,
  response.blockers.length,
  "Prompt 4: clinician handoff unresolved risks must map one-to-one with blockers.",
);
assert.equal(
  clinicianHandoff.prioritized_actions.length,
  response.next_steps.length,
  "Prompt 4: clinician handoff prioritized actions must map one-to-one with next_steps.",
);
assert.ok(
  /clinician review|sign-off/i.test(clinicianHandoff.review_boundary),
  "Prompt 4: clinician handoff must include explicit clinician-review boundaries.",
);
for (const risk of clinicianHandoff.unresolved_risks) {
  assert.ok(
    risk.trace_summary.length <= 160,
    `Prompt 4: unresolved risk ${risk.blocker_id} trace summary should stay demo-readable.`,
  );
}

const patientInstructions = draftPatientDischargeInstructionsV1(FIRST_SYNTHETIC_SCENARIO_V1);
assert.equal(
  patientInstructions.readiness_verdict,
  response.verdict,
  "Prompt 5: patient instructions verdict must match Prompt 1 readiness verdict.",
);
assert.equal(
  patientInstructions.instructions.length,
  response.blockers.length,
  "Prompt 5: patient instructions must map one-to-one with blockers.",
);
assert.ok(
  /plain language/i.test(patientInstructions.plain_language_notice),
  "Prompt 5: patient instructions should explicitly call out plain-language intent.",
);
assert.ok(
  /clinician must review|licensed clinician/i.test(patientInstructions.review_boundary),
  "Prompt 5: patient instructions should explicitly require clinician review.",
);
for (const item of patientInstructions.instructions) {
  assert.ok(
    item.care_team_verification.length <= 160,
    `Prompt 5: patient instruction ${item.id} verification note should stay demo-readable.`,
  );
}

console.log("SMOKE PASS: demo path (expanded workflow)");
console.log(
  JSON.stringify(
    {
      prompts: [PROMPT_1, PROMPT_2, PROMPT_3, PROMPT_4, PROMPT_5],
      verdict: response.verdict,
      blocker_count: response.blockers.length,
      evidence_count: response.evidence.length,
      next_step_count: response.next_steps.length,
      clinician_handoff_risk_count: clinicianHandoff.unresolved_risks.length,
      patient_instruction_count: patientInstructions.instructions.length,
    },
    null,
    2,
  ),
);
