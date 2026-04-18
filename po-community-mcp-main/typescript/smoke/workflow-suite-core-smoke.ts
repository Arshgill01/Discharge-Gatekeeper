import assert from "node:assert/strict";
import type { Request } from "express";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { REGISTERED_TOOLS } from "../tools";
import { assessDischargeReadinessV1 } from "../discharge-readiness/assess-discharge-readiness";
import { extractDischargeBlockers } from "../discharge-readiness/extract-discharge-blockers";
import { generateTransitionPlan } from "../discharge-readiness/generate-transition-plan";
import { FIRST_SYNTHETIC_SCENARIO_V1 } from "../discharge-readiness/scenario-v1";
import { SECOND_SYNTHETIC_SCENARIO_V1 } from "../discharge-readiness/scenario-v2";
import { SCENARIO_V1_TRUTH, SCENARIO_V2_TRUTH } from "../discharge-readiness/scenario-truth";
import {
  AssessDischargeReadinessResponse,
  BlockerCategory,
  CORE_WORKFLOW_TOOL_NAMES,
  DischargeBlocker,
  EvidenceTrace,
  ExtractDischargeBlockersResponse,
  GenerateTransitionPlanResponse,
  ReadinessVerdict,
  V1_BLOCKER_CATEGORIES,
} from "../discharge-readiness/contract";

const READINESS_RESPONSE_KEYS = [
  "verdict",
  "blockers",
  "evidence",
  "next_steps",
  "summary",
] as const;
const BLOCKER_EXTRACTION_KEYS = [
  "verdict",
  "blockers",
  "evidence",
  "summary",
] as const;
const TRANSITION_PLAN_KEYS = [
  "verdict",
  "blockers",
  "evidence",
  "next_steps",
  "summary",
] as const;
const EXPECTED_CORE_TOOL_NAMES = [
  "assess_discharge_readiness",
  "extract_discharge_blockers",
  "generate_transition_plan",
] as const;

const assertRegisteredToolSurface = (): void => {
  assert.deepEqual(
    [...CORE_WORKFLOW_TOOL_NAMES],
    [...EXPECTED_CORE_TOOL_NAMES],
    "Core workflow tool constants drifted from the canonical MCP tool names.",
  );

  const registeredToolNames: string[] = [];
  const fakeServer = {
    registerTool: (name: string) => {
      registeredToolNames.push(name);
    },
  } as unknown as McpServer;

  for (const tool of REGISTERED_TOOLS) {
    tool.registerTool(fakeServer, {} as Request);
  }

  assert.deepEqual(
    registeredToolNames,
    [...EXPECTED_CORE_TOOL_NAMES],
    "Registered tool surface drifted from the canonical workflow core suite.",
  );
};

const assertKeys = (
  payload: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void => {
  assert.deepEqual(
    Object.keys(payload).sort(),
    [...expected].sort(),
    `${label}: response shape drifted.`,
  );
};

const assertCanonicalCategories = (
  blockers: DischargeBlocker[],
  label: string,
): void => {
  const allowedCategories = new Set(V1_BLOCKER_CATEGORIES);
  for (const blocker of blockers) {
    assert.ok(
      allowedCategories.has(blocker.category),
      `${label}: non-canonical blocker category '${blocker.category}' detected.`,
    );
  }
};

const assertEvidenceLinkage = (
  blockers: DischargeBlocker[],
  evidence: EvidenceTrace[],
  label: string,
): void => {
  const blockerIds = new Set(blockers.map((blocker) => blocker.id));
  const evidenceIds = new Set(evidence.map((trace) => trace.id));

  for (const blocker of blockers) {
    assert.ok(blocker.evidence.length > 0, `${label}: blocker ${blocker.id} missing evidence IDs.`);
    for (const evidenceId of blocker.evidence) {
      assert.ok(
        evidenceIds.has(evidenceId),
        `${label}: blocker ${blocker.id} references unknown evidence ${evidenceId}.`,
      );
    }
  }

  for (const trace of evidence) {
    assert.ok(
      trace.supports_blockers.length > 0,
      `${label}: evidence ${trace.id} must support at least one blocker.`,
    );
    for (const blockerId of trace.supports_blockers) {
      assert.ok(
        blockerIds.has(blockerId),
        `${label}: evidence ${trace.id} links unknown blocker ${blockerId}.`,
      );
    }
  }
};

const assertTransitionLinkage = (
  response: GenerateTransitionPlanResponse,
  label: string,
): void => {
  assert.equal(
    response.next_steps.length,
    response.blockers.length,
    `${label}: transition tasks must map one-to-one with blockers.`,
  );

  const blockerById = new Map(response.blockers.map((blocker) => [blocker.id, blocker]));
  for (const step of response.next_steps) {
    assert.ok(step.owner.trim().length > 0, `${label}: step ${step.id} missing owner.`);
    assert.ok(step.action.trim().length > 0, `${label}: step ${step.id} missing action.`);
    assert.equal(
      step.linked_blockers.length,
      1,
      `${label}: step ${step.id} must link exactly one blocker.`,
    );

    const blockerId = step.linked_blockers[0];
    assert.ok(blockerId, `${label}: step ${step.id} missing blocker link.`);
    const linkedBlocker = blockerById.get(blockerId);
    assert.ok(linkedBlocker, `${label}: step ${step.id} links unknown blocker ${blockerId}.`);
    assert.equal(
      step.priority,
      linkedBlocker.priority,
      `${label}: step ${step.id} priority must match linked blocker priority.`,
    );
  }
};

const assertScenarioTruth = (
  label: string,
  readiness: AssessDischargeReadinessResponse,
  blockers: ExtractDischargeBlockersResponse,
  transition: GenerateTransitionPlanResponse,
  expectedVerdict: ReadinessVerdict,
  requiredCategories: readonly BlockerCategory[],
): void => {
  assert.equal(readiness.verdict, expectedVerdict, `${label}: readiness verdict drifted.`);
  assert.equal(blockers.verdict, expectedVerdict, `${label}: blocker extraction verdict drifted.`);
  assert.equal(transition.verdict, expectedVerdict, `${label}: transition plan verdict drifted.`);

  const categories = new Set(readiness.blockers.map((blocker) => blocker.category));
  for (const requiredCategory of requiredCategories) {
    assert.ok(categories.has(requiredCategory), `${label}: missing category ${requiredCategory}.`);
  }
};

const assertCrossToolConsistency = (
  label: string,
  readiness: AssessDischargeReadinessResponse,
  blockers: ExtractDischargeBlockersResponse,
  transition: GenerateTransitionPlanResponse,
): void => {
  assert.deepEqual(
    blockers.blockers,
    readiness.blockers,
    `${label}: blocker extraction drifted from readiness blocker model.`,
  );
  assert.deepEqual(
    blockers.evidence,
    readiness.evidence,
    `${label}: blocker extraction evidence drifted from readiness evidence trace.`,
  );
  assert.deepEqual(
    transition.blockers,
    readiness.blockers,
    `${label}: transition blocker context drifted from readiness blocker model.`,
  );
  assert.deepEqual(
    transition.evidence,
    readiness.evidence,
    `${label}: transition evidence context drifted from readiness evidence trace.`,
  );
  assert.deepEqual(
    transition.next_steps,
    readiness.next_steps,
    `${label}: transition tasks drifted from readiness next-step model.`,
  );
};

const runCase = (
  label: string,
  input: typeof FIRST_SYNTHETIC_SCENARIO_V1,
  expectedVerdict: ReadinessVerdict,
  requiredCategories: readonly BlockerCategory[],
): void => {
  const readiness = assessDischargeReadinessV1(input);
  const blockers = extractDischargeBlockers(input);
  const transition = generateTransitionPlan(input);

  assertKeys(readiness as unknown as Record<string, unknown>, READINESS_RESPONSE_KEYS, `${label}/readiness`);
  assertKeys(blockers as unknown as Record<string, unknown>, BLOCKER_EXTRACTION_KEYS, `${label}/blockers`);
  assertKeys(transition as unknown as Record<string, unknown>, TRANSITION_PLAN_KEYS, `${label}/transition`);

  assertCanonicalCategories(readiness.blockers, `${label}/readiness`);
  assertCanonicalCategories(blockers.blockers, `${label}/blockers`);
  assertCanonicalCategories(transition.blockers, `${label}/transition`);

  assertEvidenceLinkage(blockers.blockers, blockers.evidence, `${label}/blockers`);
  assertEvidenceLinkage(transition.blockers, transition.evidence, `${label}/transition`);
  assertTransitionLinkage(transition, `${label}/transition`);

  assertScenarioTruth(
    label,
    readiness,
    blockers,
    transition,
    expectedVerdict,
    requiredCategories,
  );
  assertCrossToolConsistency(label, readiness, blockers, transition);
};

assertRegisteredToolSurface();
runCase(
  "scenario-v1",
  FIRST_SYNTHETIC_SCENARIO_V1,
  SCENARIO_V1_TRUTH.verdict,
  SCENARIO_V1_TRUTH.required_categories,
);
runCase(
  "scenario-v2",
  SECOND_SYNTHETIC_SCENARIO_V1,
  SCENARIO_V2_TRUTH.verdict,
  SCENARIO_V2_TRUTH.required_categories,
);

console.log("SMOKE PASS: workflow suite core");
console.log(
  JSON.stringify(
    {
      tools: CORE_WORKFLOW_TOOL_NAMES,
      scenario_1_verdict: SCENARIO_V1_TRUTH.verdict,
      scenario_2_verdict: SCENARIO_V2_TRUTH.verdict,
    },
    null,
    2,
  ),
);
