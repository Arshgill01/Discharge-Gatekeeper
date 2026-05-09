import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { generateHiddenRiskHeuristicResponse } from "../llm/heuristic-provider";
import { HiddenRiskLlmClient } from "../llm/client";
import { surfaceHiddenRisks } from "../clinical-intelligence/surface-hidden-risks";
import { synthesizeTransitionNarrative } from "../clinical-intelligence/synthesize-transition-narrative";
import {
  ALTERNATIVE_HIDDEN_RISK_INPUT,
  DUPLICATE_SIGNAL_CONTROL_INPUT,
  INCONCLUSIVE_CONTEXT_INPUT,
  MARIA_ALVAREZ_ABLATION_INPUT,
  MEDICATION_ACCESS_HIDDEN_RISK_INPUT,
  NO_RISK_CONTROL_INPUT,
  PHASE0_TRAP_PATIENT_INPUT,
} from "../clinical-intelligence/fixtures";
import { HiddenRiskInput } from "../clinical-intelligence/contract";

process.env["CLINICAL_INTELLIGENCE_LLM_PROVIDER"] = "heuristic";

const heuristicSmokeClient: HiddenRiskLlmClient = {
  generateHiddenRiskResponse: async (input) => ({
    provider: "heuristic",
    rawText: await generateHiddenRiskHeuristicResponse(input),
  }),
};

type ScenarioSpec = {
  scenario: string;
  input: HiddenRiskInput;
  proves: string;
};

type ScenarioResult = {
  scenario: string;
  structured_baseline: string;
  narrative_result: string;
  final_status: string;
  blocker_categories: string[];
  evidence_anchors: string[];
  what_it_proves: string;
};

const scenarios: ScenarioSpec[] = [
  {
    scenario: "Maria trap patient",
    input: PHASE0_TRAP_PATIENT_INPUT,
    proves: "Structured ready can become not_ready when late nursing and case-management notes expose transition blockers.",
  },
  {
    scenario: "Maria ablation control",
    input: MARIA_ALVAREZ_ABLATION_INPUT,
    proves: "Removing contradiction notes prevents escalation.",
  },
  {
    scenario: "Clean no-risk control",
    input: NO_RISK_CONTROL_INPUT,
    proves: "Reassuring narrative evidence does not fabricate hidden risk.",
  },
  {
    scenario: "Duplicate-signal control",
    input: DUPLICATE_SIGNAL_CONTROL_INPUT,
    proves: "Narrative signals already present in deterministic blockers are suppressed instead of double-counted.",
  },
  {
    scenario: "Inconclusive missing narrative",
    input: INCONCLUSIVE_CONTEXT_INPUT,
    proves: "Missing narrative evidence requires manual review/caveat without fabricated escalation.",
  },
  {
    scenario: "Alternative home-support hidden risk",
    input: ALTERNATIVE_HIDDEN_RISK_INPUT,
    proves: "A non-oxygen social support contradiction can still change transition status.",
  },
  {
    scenario: "Medication access hidden risk",
    input: MEDICATION_ACCESS_HIDDEN_RISK_INPUT,
    proves: "The detector is not hardcoded to oxygen/stairs; blocked anticoagulation access can stop discharge.",
  },
];

const runScenario = async ({ scenario, input, proves }: ScenarioSpec): Promise<ScenarioResult> => {
  const hiddenRisk = await surfaceHiddenRisks(input, {
    llmClientOverride: heuristicSmokeClient,
  });
  const transition = await synthesizeTransitionNarrative(input);
  const blockerCategories = [
    ...new Set(transition.transition_safety_packet.reconciled_transition_status.blocker_categories),
  ];
  const evidenceAnchors = transition.transition_safety_packet.narrative_review.citations.map(
    (citation) => citation.source_label,
  );

  return {
    scenario,
    structured_baseline: input.deterministic_snapshot.baseline_verdict,
    narrative_result: hiddenRisk.payload.hidden_risk_summary.result,
    final_status: transition.proposed_disposition,
    blocker_categories: blockerCategories,
    evidence_anchors: evidenceAnchors,
    what_it_proves: proves,
  };
};

const assertScenarioMatrix = (results: ScenarioResult[]): void => {
  const byName = new Map(results.map((result) => [result.scenario, result]));
  assert.equal(byName.get("Maria trap patient")?.structured_baseline, "ready");
  assert.equal(byName.get("Maria trap patient")?.narrative_result, "hidden_risk_present");
  assert.equal(byName.get("Maria trap patient")?.final_status, "not_ready");
  assert.equal(
    byName.get("Maria trap patient")?.evidence_anchors.some((anchor) =>
      anchor.includes("Nursing Note 2026-04-18 20:40"),
    ),
    true,
  );
  assert.equal(byName.get("Maria ablation control")?.final_status, "ready");
  assert.equal(byName.get("Clean no-risk control")?.final_status, "ready");
  assert.equal(byName.get("Duplicate-signal control")?.narrative_result, "no_hidden_risk");
  assert.equal(byName.get("Inconclusive missing narrative")?.final_status, "ready_with_caveats");
  assert.equal(byName.get("Alternative home-support hidden risk")?.final_status, "not_ready");
  assert.equal(byName.get("Medication access hidden risk")?.final_status, "not_ready");
  assert.equal(
    byName.get("Medication access hidden risk")?.blocker_categories.includes("medication_reconciliation"),
    true,
  );

  for (const result of results) {
    if (result.narrative_result === "hidden_risk_present") {
      assert.ok(
        result.evidence_anchors.length > 0,
        `${result.scenario}: hidden-risk escalation must include evidence anchors.`,
      );
    }
  }
};

const main = async (): Promise<void> => {
  const generatedAt = new Date().toISOString();
  const results = [];
  for (const scenario of scenarios) {
    results.push(await runScenario(scenario));
  }

  assertScenarioMatrix(results);

  const output = {
    generated_at: generatedAt,
    contract_version: "phase9_scenario_pack_results_v1",
    scenario_count: results.length,
    results,
  };
  const outputPath = path.resolve(
    process.cwd(),
    "..",
    "..",
    "output",
    "eval",
    "latest",
    "scenario-pack-results.json",
  );
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`SMOKE PASS: scenario evidence matrix -> ${outputPath}`);
};

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

