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
import { THIRD_SYNTHETIC_SCENARIO_V1 } from "../discharge-readiness/scenario-v3";
import {
  READINESS_REGRESSION_ROBUSTNESS_CASES,
} from "../discharge-readiness/regression-fixtures";
import {
  SCENARIO_V1_TRUTH,
  SCENARIO_V2_TRUTH,
  SCENARIO_V3_TRUTH,
} from "../discharge-readiness/scenario-truth";
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
  if (handoff.unresolved_risks.length > 0) {
    assert.ok(
      /across/i.test(handoff.summary),
      `${label}: handoff summary should include risk-domain carry-through context.`,
    );
  }

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
    assert.equal(
      unresolvedRisk.trust_state,
      blocker.provenance.trust_state,
      `${label}: unresolved risk trust state should match blocker provenance.`,
    );
    assert.deepEqual(
      unresolvedRisk.source_labels,
      blocker.provenance.source_labels,
      `${label}: unresolved risk source labels should match blocker provenance.`,
    );
    assert.deepEqual(
      unresolvedRisk.contradiction_ids,
      blocker.provenance.contradiction_ids,
      `${label}: unresolved risk contradiction IDs should match blocker provenance.`,
    );
    assert.deepEqual(
      unresolvedRisk.ambiguity_ids,
      blocker.provenance.ambiguity_ids,
      `${label}: unresolved risk ambiguity IDs should match blocker provenance.`,
    );
    assert.deepEqual(
      unresolvedRisk.missing_evidence_ids,
      blocker.provenance.missing_evidence_ids,
      `${label}: unresolved risk missing evidence IDs should match blocker provenance.`,
    );
    assert.equal(
      unresolvedRisk.trace_summary,
      blocker.provenance.summary,
      `${label}: unresolved risk trace summary should match blocker provenance summary.`,
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
    assert.ok(
      unresolvedRisk.required_action.includes("Completion signal:"),
      `${label}: required action should include completion-signal scaffolding.`,
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
    assert.deepEqual(
      linkedStep.linked_evidence,
      unresolvedRisk.evidence_ids,
      `${label}: linked next-step evidence should match unresolved risk evidence.`,
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
    assert.ok(
      item.care_team_follow_up.includes("Completion signal:"),
      `${label}: care_team_follow_up should include completion-signal scaffolding.`,
    );
    assert.deepEqual(
      item.linked_evidence,
      blocker.evidence,
      `${label}: instruction ${item.id} linked evidence must match blocker evidence.`,
    );
    assert.equal(
      item.linked_next_step_id,
      linkedStep.id,
      `${label}: instruction ${item.id} linked next step should match readiness next step.`,
    );
    assert.equal(
      item.care_team_verification,
      blocker.provenance.summary,
      `${label}: instruction ${item.id} verification note must match blocker provenance summary.`,
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
  expectedBlockerCount: number,
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
  assert.equal(
    readiness.blockers.length,
    expectedBlockerCount,
    `${label}: readiness blocker count drifted.`,
  );
  assert.equal(
    handoff.unresolved_risks.length,
    expectedBlockerCount,
    `${label}: unresolved risk count drifted.`,
  );
  assert.equal(
    patientInstructions.instructions.length,
    expectedBlockerCount,
    `${label}: patient instruction count drifted.`,
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
    SCENARIO_V1_TRUTH.expected_blocker_count,
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
    SCENARIO_V2_TRUTH.expected_blocker_count,
    SCENARIO_V2_TRUTH.required_categories,
  );

  const thirdHandoff = buildClinicianHandoffBriefV1(THIRD_SYNTHETIC_SCENARIO_V1);
  const thirdInstructions = draftPatientDischargeInstructionsV1(THIRD_SYNTHETIC_SCENARIO_V1);
  assertClinicianArtifactConsistency("third", THIRD_SYNTHETIC_SCENARIO_V1, thirdHandoff);
  assertPatientArtifactConsistency("third", THIRD_SYNTHETIC_SCENARIO_V1, thirdInstructions);
  assertScenarioContinuity(
    "third",
    THIRD_SYNTHETIC_SCENARIO_V1,
    SCENARIO_V3_TRUTH.verdict,
    SCENARIO_V3_TRUTH.expected_blocker_count,
    SCENARIO_V3_TRUTH.required_categories,
  );
  assert.ok(
    /No unresolved discharge blockers/i.test(thirdHandoff.summary),
    "third: clinician handoff should explicitly state that no unresolved blockers remain.",
  );
  assert.ok(
    /No active discharge blockers/i.test(thirdInstructions.summary),
    "third: patient instructions should keep ready-state summary language explicit.",
  );

  for (const robustnessCase of READINESS_REGRESSION_ROBUSTNESS_CASES) {
    const handoff = buildClinicianHandoffBriefV1(robustnessCase.input);
    const instructions = draftPatientDischargeInstructionsV1(robustnessCase.input);
    assertClinicianArtifactConsistency(robustnessCase.id, robustnessCase.input, handoff);
    assertPatientArtifactConsistency(robustnessCase.id, robustnessCase.input, instructions);
  }

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
      third: {
        verdict: thirdHandoff.readiness_verdict,
        unresolved_risk_count: thirdHandoff.unresolved_risks.length,
        patient_instruction_count: thirdInstructions.instructions.length,
      },
      robustness_case_count: READINESS_REGRESSION_ROBUSTNESS_CASES.length,
    },
    null,
    2,
  ),
  );
};

main();
