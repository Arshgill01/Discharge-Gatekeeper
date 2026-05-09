import assert from "node:assert/strict";
import { generateHiddenRiskHeuristicResponse } from "../llm/heuristic-provider";
import { surfaceHiddenRisks } from "../clinical-intelligence/surface-hidden-risks";
import { synthesizeTransitionNarrative } from "../clinical-intelligence/synthesize-transition-narrative";
import {
  DUPLICATE_SIGNAL_CONTROL_INPUT,
  INCONCLUSIVE_CONTEXT_INPUT,
  NO_RISK_CONTROL_INPUT,
  PHASE0_TRAP_PATIENT_INPUT,
} from "../clinical-intelligence/fixtures";
import {
  buildTransitionSafetyPacket,
  evaluateSafetyInvariants,
} from "../clinical-intelligence/transition-safety-packet";
import { HiddenRiskLlmClient } from "../llm/client";
import { HiddenRiskOutput } from "../clinical-intelligence/contract";

process.env["CLINICAL_INTELLIGENCE_LLM_PROVIDER"] = "heuristic";

const heuristicSmokeClient: HiddenRiskLlmClient = {
  generateHiddenRiskResponse: async (input) => ({
    provider: "heuristic",
    rawText: await generateHiddenRiskHeuristicResponse(input),
  }),
};

const assertAllPass = (values: Record<string, string>, context: string): void => {
  for (const [name, status] of Object.entries(values)) {
    assert.equal(status, "pass", `${context}: expected ${name}=pass, saw ${status}.`);
  }
};

const getHiddenRisk = async (input: unknown): Promise<HiddenRiskOutput> => {
  const result = await surfaceHiddenRisks(input, {
    llmClientOverride: heuristicSmokeClient,
  });
  return result.payload;
};

const assertTrapPatientInvariants = async (): Promise<void> => {
  const payload = await synthesizeTransitionNarrative(PHASE0_TRAP_PATIENT_INPUT);
  assert.equal(payload.baseline_verdict, "ready");
  assert.equal(payload.proposed_disposition, "not_ready");
  assert.equal(
    payload.transition_safety_packet.narrative_review.hidden_risk_result,
    "hidden_risk_present",
  );
  assertAllPass(payload.transition_safety_packet.safety_invariants, "trap patient");
};

const assertCleanControlDoesNotEscalate = async (): Promise<void> => {
  const payload = await synthesizeTransitionNarrative(NO_RISK_CONTROL_INPUT);
  assert.equal(payload.baseline_verdict, "ready");
  assert.equal(payload.proposed_disposition, "ready");
  assert.equal(
    payload.transition_safety_packet.narrative_review.hidden_risk_result,
    "no_hidden_risk",
  );
  assert.equal(payload.transition_safety_packet.narrative_review.citations.length, 0);
  assertAllPass(payload.transition_safety_packet.safety_invariants, "clean control");
};

const assertInconclusiveRequiresManualReview = async (): Promise<void> => {
  const payload = await synthesizeTransitionNarrative(INCONCLUSIVE_CONTEXT_INPUT);
  assert.equal(payload.status, "insufficient_context");
  assert.equal(payload.baseline_verdict, "ready");
  assert.equal(payload.proposed_disposition, "ready_with_caveats");
  assert.equal(payload.manual_review_required, true);
  assert.equal(
    payload.transition_safety_packet.reconciled_transition_status.manual_review_required,
    true,
  );
  assert.equal(
    payload.transition_safety_packet.safety_invariants.manual_review_on_uncertainty,
    "pass",
  );
  assert.equal(payload.transition_safety_packet.narrative_review.citations.length, 0);
};

const assertDuplicateSignalSuppression = async (): Promise<void> => {
  const hiddenRisk = await getHiddenRisk(DUPLICATE_SIGNAL_CONTROL_INPUT);
  assert.equal(hiddenRisk.hidden_risk_summary.result, "no_hidden_risk");
  assert.equal(hiddenRisk.hidden_risk_findings.length, 0);
  assert.equal(hiddenRisk.review_metadata.duplicate_findings_suppressed > 0, true);

  const packet = buildTransitionSafetyPacket({
    input: DUPLICATE_SIGNAL_CONTROL_INPUT,
    hiddenRisk,
    finalVerdict: DUPLICATE_SIGNAL_CONTROL_INPUT.deterministic_snapshot.baseline_verdict,
    blockerCategories: DUPLICATE_SIGNAL_CONTROL_INPUT.deterministic_snapshot.deterministic_blockers.map(
      (blocker) => blocker.category,
    ),
    actionRouter: [],
    provider: "heuristic",
  });
  assert.equal(packet.safety_invariants.duplicate_signal_suppression, "pass");
  assert.equal(packet.reconciled_transition_status.blocker_categories.length, 1);
};

const assertInvariantFailuresAreDetectable = (): void => {
  const uncitedHiddenRisk: HiddenRiskOutput = {
    contract_version: "phase0_hidden_risk_v1",
    status: "ok",
    patient_id: "phase9-invariant-test",
    encounter_id: "enc-phase9-invariant-test",
    baseline_verdict: "ready",
    hidden_risk_summary: {
      result: "hidden_risk_present",
      overall_disposition_impact: "not_ready",
      confidence: "high",
      summary: "Synthetic uncited escalation.",
      manual_review_required: false,
      false_positive_guardrail: "test",
    },
    hidden_risk_findings: [
      {
        finding_id: "hr_uncited",
        title: "Uncited high-confidence hidden blocker",
        category: "clinical_stability",
        disposition_impact: "not_ready",
        confidence: "high",
        is_duplicate_of_blocker_id: null,
        rationale: "Synthetic uncited blocker.",
        recommended_orchestrator_action: "add_blocker",
        citation_ids: [],
      },
    ],
    citations: [],
    review_metadata: {
      narrative_sources_reviewed: 1,
      duplicate_findings_suppressed: 0,
      weak_findings_suppressed: 0,
    },
  };

  const invariants = evaluateSafetyInvariants({
    structuredBaselineVisible: true,
    structuredBaselineVerdict: "ready",
    finalVerdict: "ready",
    hiddenRisk: uncitedHiddenRisk,
  });
  assert.equal(invariants.no_uncited_escalation, "fail");
  assert.equal(invariants.no_ready_with_active_hidden_blocker, "fail");
};

const main = async (): Promise<void> => {
  await assertTrapPatientInvariants();
  await assertCleanControlDoesNotEscalate();
  await assertInconclusiveRequiresManualReview();
  await assertDuplicateSignalSuppression();
  assertInvariantFailuresAreDetectable();
  console.log("SMOKE PASS: safety invariants");
};

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

