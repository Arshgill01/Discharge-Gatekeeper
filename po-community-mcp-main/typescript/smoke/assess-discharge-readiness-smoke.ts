import assert from "node:assert/strict";
import { assessDischargeReadinessV1 } from "../discharge-readiness/assess-discharge-readiness";
import {
  AssessDischargeReadinessResponse,
  BlockerCategory,
  BlockerPriority,
  V1_BLOCKER_CATEGORIES,
} from "../discharge-readiness/contract";
import {
  THIRD_SYNTHETIC_SCENARIO_AMBIGUITY_V1,
} from "../discharge-readiness/scenario-fixtures";
import { FIRST_SYNTHETIC_SCENARIO_V1 } from "../discharge-readiness/scenario-v1";
import { SECOND_SYNTHETIC_SCENARIO_V1 } from "../discharge-readiness/scenario-v2";
import {
  SCENARIO_V1_TRUTH,
  SCENARIO_V2_TRUTH,
  ScenarioTruth,
} from "../discharge-readiness/scenario-truth";

const priorityWeight: Record<BlockerPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const expectedResponseKeys = ["verdict", "blockers", "evidence", "next_steps", "summary"];

const assertContractShape = (
  label: string,
  response: AssessDischargeReadinessResponse,
) => {
  assert.deepEqual(
    Object.keys(response).sort(),
    [...expectedResponseKeys].sort(),
    `${label}: top-level response keys drifted.`,
  );
  assert.match(response.summary, /^Verdict: /, `${label}: summary should start with verdict.`);
};

const assertCanonicalCategories = (
  label: string,
  categories: Set<BlockerCategory>,
) => {
  const allowedCategories = new Set(V1_BLOCKER_CATEGORIES);
  for (const category of categories) {
    assert.ok(
      allowedCategories.has(category),
      `${label}: unexpected blocker category outside canonical taxonomy: ${category}`,
    );
  }
};

const assertBlockerSort = (label: string, response: AssessDischargeReadinessResponse) => {
  for (let i = 1; i < response.blockers.length; i++) {
    const previous = response.blockers[i - 1];
    const current = response.blockers[i];
    assert.ok(previous, `${label}: previous blocker should exist.`);
    assert.ok(current, `${label}: current blocker should exist.`);
    assert.ok(
      priorityWeight[previous.priority] >= priorityWeight[current.priority],
      `${label}: blockers should be sorted by descending priority.`,
    );
  }
};

const assertEvidenceAndNextSteps = (
  label: string,
  response: AssessDischargeReadinessResponse,
) => {
  const blockerById = new Map(response.blockers.map((blocker) => [blocker.id, blocker]));
  const evidenceIds = new Set(response.evidence.map((trace) => trace.id));

  for (const blocker of response.blockers) {
    assert.ok(blocker.evidence.length > 0, `${label}: blocker ${blocker.id} missing evidence.`);
    for (const evidenceId of blocker.evidence) {
      assert.ok(
        evidenceIds.has(evidenceId),
        `${label}: blocker ${blocker.id} references unknown evidence ${evidenceId}.`,
      );
    }
  }

  for (const trace of response.evidence) {
    assert.ok(
      trace.supports_blockers.length > 0,
      `${label}: evidence ${trace.id} has no linked blockers.`,
    );
    for (const blockerId of trace.supports_blockers) {
      const blocker = blockerById.get(blockerId);
      assert.ok(blocker, `${label}: evidence ${trace.id} references unknown blocker ${blockerId}.`);
      assert.ok(
        blocker.evidence.includes(trace.id),
        `${label}: evidence ${trace.id} should be back-linked from blocker ${blockerId}.`,
      );
    }
  }

  assert.equal(
    response.next_steps.length,
    response.blockers.length,
    `${label}: expected next step count to match blockers.`,
  );

  for (const step of response.next_steps) {
    assert.equal(
      step.linked_blockers.length,
      1,
      `${label}: next step ${step.id} should link to exactly one blocker in v1.`,
    );
    const linkedBlockerId = step.linked_blockers[0];
    assert.ok(linkedBlockerId, `${label}: next step ${step.id} missing linked blocker id.`);
    const blocker = blockerById.get(linkedBlockerId);
    assert.ok(blocker, `${label}: next step ${step.id} references unknown blocker ${linkedBlockerId}.`);
    assert.equal(
      step.priority,
      blocker.priority,
      `${label}: next step ${step.id} priority should match blocker ${linkedBlockerId}.`,
    );
    assert.ok(step.action.length > 0, `${label}: next step ${step.id} missing action.`);
    assert.ok(step.owner.length > 0, `${label}: next step ${step.id} missing owner.`);
  }
};

const assertSharedContractInvariants = (
  label: string,
  response: AssessDischargeReadinessResponse,
) => {
  assertContractShape(label, response);
  assertBlockerSort(label, response);
  assertEvidenceAndNextSteps(label, response);
  assertCanonicalCategories(
    label,
    new Set(response.blockers.map((blocker) => blocker.category)),
  );
};

const assertScenarioTruth = (
  label: string,
  response: AssessDischargeReadinessResponse,
  truth: ScenarioTruth,
) => {
  assert.equal(response.verdict, truth.verdict, `${label}: verdict drifted from scenario truth.`);
  assert.ok(
    response.summary.includes(truth.summary_phrase),
    `${label}: summary should include '${truth.summary_phrase}'.`,
  );

  const categories = new Set(response.blockers.map((blocker) => blocker.category));
  for (const requiredCategory of truth.required_categories) {
    assert.ok(categories.has(requiredCategory), `${label}: missing category ${requiredCategory}.`);
  }
  for (const forbiddenCategory of truth.forbidden_categories) {
    assert.ok(
      !categories.has(forbiddenCategory),
      `${label}: forbidden category ${forbiddenCategory} should not be present.`,
    );
  }

  const priorities: Record<BlockerPriority, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const blocker of response.blockers) {
    priorities[blocker.priority] += 1;
  }

  for (const [priority, expectedCount] of Object.entries(truth.priority_counts)) {
    const typedPriority = priority as BlockerPriority;
    assert.equal(
      priorities[typedPriority],
      expectedCount,
      `${label}: unexpected ${typedPriority} blocker count.`,
    );
  }
};

const primary = assessDischargeReadinessV1(FIRST_SYNTHETIC_SCENARIO_V1);
assertSharedContractInvariants("primary", primary);
assertScenarioTruth("primary", primary, SCENARIO_V1_TRUTH);
assert.equal(primary.blockers.length, 6, "primary: expected six blockers.");

const primaryCategorySet = new Set(primary.blockers.map((blocker) => blocker.category));
const primaryExpectedCategories: BlockerCategory[] = [
  "clinical_stability",
  "medication_reconciliation",
  "follow_up_and_referrals",
  "patient_education",
  "home_support_and_services",
  "equipment_and_transport",
];
for (const category of primaryExpectedCategories) {
  assert.ok(primaryCategorySet.has(category), `primary: missing blocker category ${category}.`);
}

const primaryHighCount = primary.blockers.filter((blocker) => blocker.priority === "high").length;
const primaryMediumCount = primary.blockers.filter(
  (blocker) => blocker.priority === "medium",
).length;
assert.equal(primaryHighCount, 4, "primary: expected four high-priority blockers.");
assert.equal(primaryMediumCount, 2, "primary: expected two medium-priority blockers.");

const second = assessDischargeReadinessV1(SECOND_SYNTHETIC_SCENARIO_V1);
assertSharedContractInvariants("second", second);
assertScenarioTruth("second", second, SCENARIO_V2_TRUTH);
assert.equal(second.blockers.length, 4, "second: expected four caveat blockers.");
const secondCategories = new Set(second.blockers.map((blocker) => blocker.category));
assert.deepEqual(
  [...secondCategories].sort(),
  [
    "administrative_and_documentation",
    "equipment_and_transport",
    "follow_up_and_referrals",
    "patient_education",
  ],
  "second: expected canonical caveat categories from scenario truth.",
);

const ambiguity = assessDischargeReadinessV1(THIRD_SYNTHETIC_SCENARIO_AMBIGUITY_V1);
assertSharedContractInvariants("ambiguity", ambiguity);
assert.equal(ambiguity.verdict, "not_ready", "ambiguity: expected verdict not_ready.");
const ambiguityDescriptions = ambiguity.blockers.map((blocker) => blocker.description);
assert.ok(
  ambiguityDescriptions.some((description) => description.includes("Evidence conflict")),
  "ambiguity: expected at least one blocker to surface conflicting evidence.",
);
assert.ok(
  ambiguityDescriptions.some((description) => description.includes("Evidence uncertainty")),
  "ambiguity: expected at least one blocker to surface insufficient/uncertain evidence.",
);
const ambiguityCategories = new Set(ambiguity.blockers.map((blocker) => blocker.category));
assert.ok(
  ambiguityCategories.has("clinical_stability"),
  "ambiguity: expected clinical_stability blocker from contradictory evidence.",
);
assert.ok(
  ambiguityCategories.has("medication_reconciliation"),
  "ambiguity: expected medication_reconciliation blocker from uncertain evidence.",
);

console.log("SMOKE PASS: assess_discharge_readiness v1");
console.log(
  JSON.stringify(
    {
      primary: {
        verdict: primary.verdict,
        blocker_count: primary.blockers.length,
        evidence_count: primary.evidence.length,
        next_step_count: primary.next_steps.length,
      },
      second: {
        verdict: second.verdict,
        blocker_count: second.blockers.length,
        evidence_count: second.evidence.length,
        next_step_count: second.next_steps.length,
      },
      ambiguity: {
        verdict: ambiguity.verdict,
        blocker_count: ambiguity.blockers.length,
        evidence_count: ambiguity.evidence.length,
        next_step_count: ambiguity.next_steps.length,
      },
    },
    null,
    2,
  ),
);
