import assert from "node:assert/strict";
import { assessDischargeReadinessV1 } from "../discharge-readiness/assess-discharge-readiness";
import {
  AssessDischargeReadinessResponse,
  BLOCKER_PRIORITIES,
  BlockerPriority,
  ReadinessInput,
  V1_BLOCKER_CATEGORIES,
  V1_TOOL_NAME,
  V1_VERDICTS,
} from "../discharge-readiness/contract";
import {
  READINESS_REGRESSION_FAILURE_CASES,
  READINESS_REGRESSION_ROBUSTNESS_CASES,
  READINESS_REGRESSION_SUCCESS_CASES,
} from "../discharge-readiness/regression-fixtures";

const REQUIRED_RESPONSE_KEYS = [
  "verdict",
  "blockers",
  "evidence",
  "next_steps",
  "summary",
] as const;

const EXPECTED_TOOL_NAME = "assess_discharge_readiness";
const EXPECTED_VERDICTS = ["ready", "ready_with_caveats", "not_ready"] as const;
const EXPECTED_BLOCKER_CATEGORIES = [
  "clinical_stability",
  "pending_diagnostics",
  "medication_reconciliation",
  "follow_up_and_referrals",
  "patient_education",
  "home_support_and_services",
  "equipment_and_transport",
  "administrative_and_documentation",
] as const;

const PRIORITY_WEIGHT: Record<BlockerPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const assertFrozenContractConstants = (): void => {
  assert.equal(
    V1_TOOL_NAME,
    EXPECTED_TOOL_NAME,
    "Tool name drift detected; canonical MCP tool must remain assess_discharge_readiness.",
  );
  assert.deepEqual(
    [...V1_VERDICTS],
    [...EXPECTED_VERDICTS],
    "Verdict taxonomy drift detected against frozen canonical verdict states.",
  );
  assert.deepEqual(
    [...V1_BLOCKER_CATEGORIES],
    [...EXPECTED_BLOCKER_CATEGORIES],
    "Blocker taxonomy drift detected against frozen canonical category set.",
  );
};

const countPriorities = (response: AssessDischargeReadinessResponse): Record<BlockerPriority, number> => {
  const counts: Record<BlockerPriority, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const blocker of response.blockers) {
    counts[blocker.priority] += 1;
  }

  return counts;
};

const assertCanonicalResponseShape = (
  response: AssessDischargeReadinessResponse,
  caseId: string,
): void => {
  const responseKeys = Object.keys(response).sort();
  assert.deepEqual(
    responseKeys,
    [...REQUIRED_RESPONSE_KEYS].sort(),
    `${caseId}: response keys must match frozen v1 contract`,
  );
  assert.ok(
    V1_VERDICTS.includes(response.verdict),
    `${caseId}: verdict '${response.verdict}' is outside canonical verdict taxonomy.`,
  );

  const allowedCategories = new Set(V1_BLOCKER_CATEGORIES);
  for (const blocker of response.blockers) {
    assert.ok(
      allowedCategories.has(blocker.category),
      `${caseId}: blocker ${blocker.id} uses non-canonical category '${blocker.category}'`,
    );
  }

  for (const priority of BLOCKER_PRIORITIES) {
    assert.ok(
      PRIORITY_WEIGHT[priority] > 0,
      `${caseId}: blocker priority '${priority}' must remain part of canonical priority set`,
    );
  }

  for (let i = 1; i < response.blockers.length; i++) {
    const previous = response.blockers[i - 1];
    const current = response.blockers[i];
    assert.ok(previous, `${caseId}: previous blocker missing during priority-order check`);
    assert.ok(current, `${caseId}: current blocker missing during priority-order check`);

    assert.ok(
      PRIORITY_WEIGHT[previous.priority] >= PRIORITY_WEIGHT[current.priority],
      `${caseId}: blockers must stay sorted by descending priority`,
    );
  }

  const blockerIds = new Set(response.blockers.map((blocker) => blocker.id));
  const evidenceIds = new Set(response.evidence.map((trace) => trace.id));
  assert.equal(
    blockerIds.size,
    response.blockers.length,
    `${caseId}: blocker IDs must remain unique.`,
  );
  assert.equal(
    evidenceIds.size,
    response.evidence.length,
    `${caseId}: evidence IDs must remain unique.`,
  );
  const nextStepIds = new Set(response.next_steps.map((step) => step.id));
  assert.equal(
    nextStepIds.size,
    response.next_steps.length,
    `${caseId}: next step IDs must remain unique.`,
  );

  for (const blocker of response.blockers) {
    assert.ok(blocker.evidence.length > 0, `${caseId}: blocker ${blocker.id} must include evidence`);
    assert.ok(
      blocker.provenance.summary.trim().length > 0,
      `${caseId}: blocker ${blocker.id} must expose provenance summary`,
    );
    assert.ok(
      blocker.provenance.source_labels.length > 0,
      `${caseId}: blocker ${blocker.id} must expose source labels`,
    );

    for (const evidenceId of blocker.evidence) {
      assert.ok(
        evidenceIds.has(evidenceId),
        `${caseId}: blocker ${blocker.id} references missing evidence '${evidenceId}'`,
      );
    }
  }

  for (const trace of response.evidence) {
    assert.ok(trace.supports_blockers.length > 0, `${caseId}: evidence ${trace.id} has no linked blockers`);
    assert.ok(trace.supports_next_steps.length > 0, `${caseId}: evidence ${trace.id} has no linked next steps`);
    assert.ok(trace.source_summary.trim().length > 0, `${caseId}: evidence ${trace.id} missing source summary`);

    for (const blockerId of trace.supports_blockers) {
      assert.ok(
        blockerIds.has(blockerId),
        `${caseId}: evidence ${trace.id} references unknown blocker '${blockerId}'`,
      );
    }
  }

  assert.equal(
    response.next_steps.length,
    response.blockers.length,
    `${caseId}: next_steps must map one-to-one with blockers`,
  );

  const blockerById = new Map(response.blockers.map((blocker) => [blocker.id, blocker]));
  for (const step of response.next_steps) {
    assert.equal(
      step.linked_blockers.length,
      1,
      `${caseId}: next step ${step.id} must link to one blocker in v1`,
    );

    const linkedBlockerId = step.linked_blockers[0];
    assert.ok(linkedBlockerId, `${caseId}: next step ${step.id} missing linked blocker id`);

    const linkedBlocker = blockerById.get(linkedBlockerId);
    assert.ok(
      linkedBlocker,
      `${caseId}: next step ${step.id} links unknown blocker '${linkedBlockerId}'`,
    );

    assert.equal(
      step.priority,
      linkedBlocker.priority,
      `${caseId}: next step ${step.id} priority must match blocker ${linkedBlockerId}`,
    );
    assert.deepEqual(
      step.linked_evidence,
      linkedBlocker.evidence,
      `${caseId}: next step ${step.id} linked evidence must match blocker ${linkedBlockerId}`,
    );
    assert.equal(
      step.blocker_trust_state,
      linkedBlocker.provenance.trust_state,
      `${caseId}: next step ${step.id} trust state must match blocker ${linkedBlockerId}`,
    );
    assert.ok(step.owner.trim().length > 0, `${caseId}: next step ${step.id} owner is required`);
    assert.ok(step.action.trim().length > 0, `${caseId}: next step ${step.id} action is required`);
  }
};

const assertSuccessCase = (): void => {
  for (const regressionCase of READINESS_REGRESSION_SUCCESS_CASES) {
    const response = assessDischargeReadinessV1(regressionCase.input);

    assertCanonicalResponseShape(response, regressionCase.id);
    assert.equal(response.verdict, regressionCase.expected.verdict, `${regressionCase.id}: verdict drift`);
    assert.equal(
      response.blockers.length,
      regressionCase.expected.expected_blocker_count,
      `${regressionCase.id}: blocker count drift`,
    );
    assert.ok(
      response.summary.includes(regressionCase.expected.summary_phrase),
      `${regressionCase.id}: summary should include '${regressionCase.expected.summary_phrase}'`,
    );

    const categories = new Set(response.blockers.map((blocker) => blocker.category));
    for (const requiredCategory of regressionCase.expected.required_categories) {
      assert.ok(
        categories.has(requiredCategory),
        `${regressionCase.id}: required category '${requiredCategory}' missing`,
      );
    }

    for (const forbiddenCategory of regressionCase.expected.forbidden_categories) {
      assert.ok(
        !categories.has(forbiddenCategory),
        `${regressionCase.id}: forbidden category '${forbiddenCategory}' should not be present`,
      );
    }

    const actualPriorityCounts = countPriorities(response);
    for (const priority of BLOCKER_PRIORITIES) {
      const expectedCount = regressionCase.expected.priority_counts[priority];
      if (expectedCount === undefined) {
        continue;
      }

      assert.equal(
        actualPriorityCounts[priority],
        expectedCount,
        `${regressionCase.id}: unexpected ${priority} blocker count`,
      );
    }
  }
};

const assertFailureCase = (): void => {
  for (const regressionCase of READINESS_REGRESSION_FAILURE_CASES) {
    let receivedError: unknown;

    try {
      assessDischargeReadinessV1(regressionCase.input as ReadinessInput);
    } catch (error) {
      receivedError = error;
    }

    assert.ok(receivedError, `${regressionCase.id}: expected failure did not occur`);

    const message = receivedError instanceof Error
      ? receivedError.message
      : String(receivedError);

    assert.ok(
      message.includes(regressionCase.expected_error),
      `${regressionCase.id}: expected error containing '${regressionCase.expected_error}', received '${message}'`,
    );
  }
};

const assertRobustnessCase = (): void => {
  for (const regressionCase of READINESS_REGRESSION_ROBUSTNESS_CASES) {
    const response = assessDischargeReadinessV1(regressionCase.input);

    assertCanonicalResponseShape(response, regressionCase.id);
    assert.equal(
      response.verdict,
      regressionCase.expected_verdict,
      `${regressionCase.id}: robustness verdict drift`,
    );

    const categories = new Set(response.blockers.map((blocker) => blocker.category));
    for (const category of regressionCase.expected_categories) {
      assert.ok(categories.has(category), `${regressionCase.id}: missing robustness category '${category}'`);
    }

    const descriptions = response.blockers.map((blocker) => blocker.description);
    for (const fragment of regressionCase.required_description_fragments) {
      assert.ok(
        descriptions.some((description) => description.includes(fragment)),
        `${regressionCase.id}: expected description fragment '${fragment}' not found`,
      );
    }
  }
};

assertFrozenContractConstants();
assertSuccessCase();
assertRobustnessCase();
assertFailureCase();

console.log("REGRESSION PASS: assess_discharge_readiness matrix");
console.log(
  JSON.stringify(
    {
      success_cases: READINESS_REGRESSION_SUCCESS_CASES.map((regressionCase) => ({
        id: regressionCase.id,
        verdict: regressionCase.expected.verdict,
      })),
      robustness_cases: READINESS_REGRESSION_ROBUSTNESS_CASES.map((regressionCase) => ({
        id: regressionCase.id,
        verdict: regressionCase.expected_verdict,
      })),
      failure_cases: READINESS_REGRESSION_FAILURE_CASES.map((regressionCase) => ({
        id: regressionCase.id,
        expected_error: regressionCase.expected_error,
      })),
    },
    null,
    2,
  ),
);
