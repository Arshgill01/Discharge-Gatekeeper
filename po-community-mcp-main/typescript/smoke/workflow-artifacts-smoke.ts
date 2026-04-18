import assert from "node:assert/strict";
import { assessDischargeReadinessV1 } from "../discharge-readiness/assess-discharge-readiness";
import {
  BlockerCategory,
  ClinicianHandoffBriefResponse,
  PatientDischargeInstructionsResponse,
  ReadinessInput,
} from "../discharge-readiness/contract";
import { FIRST_SYNTHETIC_SCENARIO_V1 } from "../discharge-readiness/scenario-v1";
import { SECOND_SYNTHETIC_SCENARIO_V1 } from "../discharge-readiness/scenario-v2";
import { SCENARIO_V1_TRUTH, SCENARIO_V2_TRUTH } from "../discharge-readiness/scenario-truth";
import {
  buildClinicianHandoffBriefV1,
  draftPatientDischargeInstructionsV1,
} from "../discharge-readiness/workflow-artifacts";

const PROMPTS = [
  "Is this patient safe to discharge today?",
  "What exactly is blocking discharge right now?",
  "What must happen before this patient leaves?",
  "Build the clinician handoff brief.",
  "Draft patient discharge instructions.",
] as const;

const AUTONOMY_DRIFT_PATTERNS = [
  /autonomous discharge/i,
  /approved by ai/i,
  /no clinician review needed/i,
];

const assertAssistiveBoundary = (
  label: string,
  boundaryText: string,
): void => {
  assert.ok(boundaryText.trim().length > 0, `${label}: boundary text is required.`);
  assert.ok(
    /clinician/i.test(boundaryText) && /review|sign-off|finalize/i.test(boundaryText),
    `${label}: boundary text must keep clinician review/sign-off explicit.`,
  );
  for (const pattern of AUTONOMY_DRIFT_PATTERNS) {
    assert.ok(!pattern.test(boundaryText), `${label}: autonomy drift phrase detected (${pattern}).`);
  }
};

const assertClinicianArtifactConsistency = (
  label: string,
  input: ReadinessInput,
  handoff: ClinicianHandoffBriefResponse,
): void => {
  const readiness = assessDischargeReadinessV1(input);
  assert.equal(
    handoff.readiness_verdict,
    readiness.verdict,
    `${label}: handoff verdict must match readiness verdict.`,
  );
  assert.equal(
    handoff.unresolved_risks.length,
    readiness.blockers.length,
    `${label}: unresolved risk count must map one-to-one to blockers.`,
  );
  assert.equal(
    handoff.prioritized_actions.length,
    readiness.next_steps.length,
    `${label}: prioritized actions must map one-to-one to readiness next_steps.`,
  );
  assertAssistiveBoundary(`${label}: clinician review boundary`, handoff.review_boundary);
  assert.ok(
    /clinician review|sign-off|clinical team/i.test(handoff.summary),
    `${label}: handoff summary must keep review/sign-off language explicit.`,
  );

  const blockerById = new Map(readiness.blockers.map((blocker) => [blocker.id, blocker]));
  const nextStepByBlockerId = new Map(
    readiness.next_steps.map((step) => [step.linked_blockers[0], step]),
  );

  for (const unresolvedRisk of handoff.unresolved_risks) {
    const blocker = blockerById.get(unresolvedRisk.blocker_id);
    assert.ok(blocker, `${label}: unresolved risk references unknown blocker ${unresolvedRisk.blocker_id}.`);
    assert.equal(
      unresolvedRisk.category,
      blocker.category,
      `${label}: unresolved risk category should match linked blocker category.`,
    );
    assert.equal(
      unresolvedRisk.priority,
      blocker.priority,
      `${label}: unresolved risk priority should match linked blocker priority.`,
    );
    assert.ok(
      unresolvedRisk.unresolved_risk.trim().length > 0,
      `${label}: unresolved risk description must not be empty.`,
    );
    assert.deepEqual(
      unresolvedRisk.evidence_ids,
      blocker.evidence,
      `${label}: unresolved risk evidence must stay aligned with blocker evidence IDs.`,
    );

    const linkedStep = nextStepByBlockerId.get(unresolvedRisk.blocker_id);
    assert.ok(
      linkedStep,
      `${label}: unresolved risk must map to a readiness next step for blocker ${unresolvedRisk.blocker_id}.`,
    );
    assert.equal(
      unresolvedRisk.required_action,
      linkedStep.action,
      `${label}: required action must map to linked next-step action.`,
    );
    assert.equal(
      unresolvedRisk.owner,
      linkedStep.owner,
      `${label}: owner must map to linked next-step owner.`,
    );
    assert.equal(
      unresolvedRisk.linked_next_step_id,
      linkedStep.id,
      `${label}: linked next-step ID must match readiness next-step ID.`,
    );
  }
};

const assertPatientArtifactConsistency = (
  label: string,
  input: ReadinessInput,
  instructions: PatientDischargeInstructionsResponse,
): void => {
  const readiness = assessDischargeReadinessV1(input);
  assert.equal(
    instructions.readiness_verdict,
    readiness.verdict,
    `${label}: patient instructions verdict must match readiness verdict.`,
  );
  assert.equal(
    instructions.instructions.length,
    readiness.blockers.length,
    `${label}: patient instructions must map one-to-one to blockers.`,
  );

  assert.ok(
    /plain language/i.test(instructions.plain_language_notice),
    `${label}: plain_language_notice must explicitly state plain-language intent.`,
  );
  assertAssistiveBoundary(`${label}: patient review boundary`, instructions.review_boundary);

  const blockerById = new Map(readiness.blockers.map((blocker) => [blocker.id, blocker]));
  const nextStepByBlockerId = new Map(
    readiness.next_steps.map((step) => [step.linked_blockers[0], step]),
  );

  for (const item of instructions.instructions) {
    assert.equal(item.linked_blockers.length, 1, `${label}: each instruction must link exactly one blocker.`);
    const linkedBlockerId = item.linked_blockers[0];
    assert.ok(linkedBlockerId, `${label}: instruction ${item.id} must include linked blocker ID.`);
    const blocker = blockerById.get(linkedBlockerId);
    assert.ok(blocker, `${label}: instruction ${item.id} references unknown blocker ${linkedBlockerId}.`);

    assert.ok(item.title.trim().length > 0, `${label}: instruction ${item.id} title is required.`);
    assert.ok(item.reason.trim().length > 0, `${label}: instruction ${item.id} reason is required.`);
    assert.ok(
      item.instruction.startsWith("Before you leave"),
      `${label}: instruction ${item.id} should use plain-language patient framing.`,
    );
    assert.ok(
      item.instruction.length <= 220,
      `${label}: instruction ${item.id} should stay concise for readability.`,
    );

    const linkedStep = nextStepByBlockerId.get(linkedBlockerId);
    assert.ok(linkedStep, `${label}: instruction ${item.id} must map to readiness next step.`);
    assert.equal(
      item.care_team_follow_up,
      linkedStep.action,
      `${label}: care_team_follow_up must map to readiness next-step action.`,
    );

    for (const pattern of AUTONOMY_DRIFT_PATTERNS) {
      assert.ok(!pattern.test(item.instruction), `${label}: autonomy drift phrase in patient instruction.`);
      assert.ok(!pattern.test(item.reason), `${label}: autonomy drift phrase in patient instruction reason.`);
    }
  }

  assert.ok(
    instructions.follow_up_reminders.length > 0,
    `${label}: follow-up reminders must include at least one reminder.`,
  );
  for (const reminder of instructions.follow_up_reminders) {
    assert.ok(reminder.length >= 20, `${label}: reminder should remain readable and meaningful.`);
  }
  assert.ok(
    /emergency services/i.test(instructions.emergency_guidance),
    `${label}: emergency guidance should include emergency-services escalation text.`,
  );
};

const assertScenarioContinuity = (
  label: string,
  input: ReadinessInput,
  expectedVerdict: string,
  expectedCategories: BlockerCategory[],
): void => {
  const readiness = assessDischargeReadinessV1(input);
  const handoff = buildClinicianHandoffBriefV1(input);
  const patientInstructions = draftPatientDischargeInstructionsV1(input);

  assert.equal(readiness.verdict, expectedVerdict, `${label}: readiness verdict drifted.`);
  assert.equal(handoff.readiness_verdict, expectedVerdict, `${label}: handoff verdict drifted.`);
  assert.equal(
    patientInstructions.readiness_verdict,
    expectedVerdict,
    `${label}: patient instructions verdict drifted.`,
  );

  const categorySet = new Set(readiness.blockers.map((blocker) => blocker.category));
  for (const category of expectedCategories) {
    assert.ok(categorySet.has(category), `${label}: expected blocker category ${category} is missing.`);
  }
};

const main = (): void => {
  const primaryHandoff = buildClinicianHandoffBriefV1(FIRST_SYNTHETIC_SCENARIO_V1);
  const primaryInstructions = draftPatientDischargeInstructionsV1(FIRST_SYNTHETIC_SCENARIO_V1);
  assertClinicianArtifactConsistency("primary", FIRST_SYNTHETIC_SCENARIO_V1, primaryHandoff);
  assertPatientArtifactConsistency("primary", FIRST_SYNTHETIC_SCENARIO_V1, primaryInstructions);
  assertScenarioContinuity(
    "primary",
    FIRST_SYNTHETIC_SCENARIO_V1,
    SCENARIO_V1_TRUTH.verdict,
    SCENARIO_V1_TRUTH.required_categories,
  );

  const secondHandoff = buildClinicianHandoffBriefV1(SECOND_SYNTHETIC_SCENARIO_V1);
  const secondInstructions = draftPatientDischargeInstructionsV1(SECOND_SYNTHETIC_SCENARIO_V1);
  assertClinicianArtifactConsistency("second", SECOND_SYNTHETIC_SCENARIO_V1, secondHandoff);
  assertPatientArtifactConsistency("second", SECOND_SYNTHETIC_SCENARIO_V1, secondInstructions);
  assertScenarioContinuity(
    "second",
    SECOND_SYNTHETIC_SCENARIO_V1,
    SCENARIO_V2_TRUTH.verdict,
    SCENARIO_V2_TRUTH.required_categories,
  );

  console.log("SMOKE PASS: workflow artifacts suite");
  console.log(
    JSON.stringify(
      {
        prompts: [...PROMPTS],
        primary: {
          verdict: primaryHandoff.readiness_verdict,
          unresolved_risk_count: primaryHandoff.unresolved_risks.length,
          patient_instruction_count: primaryInstructions.instructions.length,
        },
        second: {
          verdict: secondHandoff.readiness_verdict,
          unresolved_risk_count: secondHandoff.unresolved_risks.length,
          patient_instruction_count: secondInstructions.instructions.length,
        },
      },
      null,
      2,
    ),
  );
};

main();
