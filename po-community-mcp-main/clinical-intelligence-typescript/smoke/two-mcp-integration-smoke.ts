import assert from "node:assert/strict";
import { assessDischargeReadinessV1 } from "../../typescript/discharge-readiness/assess-discharge-readiness";
import { ReadinessInput } from "../../typescript/discharge-readiness/contract";
import { FIRST_SYNTHETIC_SCENARIO_V1 } from "../../typescript/discharge-readiness/scenario-v1";
import { HiddenRiskLlmClient } from "../llm/client";
import { HiddenRiskInput } from "../clinical-intelligence/contract";
import { surfaceHiddenRisks } from "../clinical-intelligence/surface-hidden-risks";
import {
  ALTERNATIVE_HIDDEN_RISK_INPUT,
  DUPLICATE_SIGNAL_CONTROL_INPUT,
  INCONCLUSIVE_CONTEXT_INPUT,
  MARIA_ALVAREZ_ABLATION_INPUT,
  NO_RISK_CONTROL_INPUT,
  PHASE0_TRAP_PATIENT_INPUT,
} from "../clinical-intelligence/fixtures";

const PHASE2_TRAP_STRUCTURED_BASELINE: ReadinessInput = {
  scenario_id: "phase2_trap_structured_ready_v1",
  clinical_stability: {
    vitals_stable: true,
    oxygen_lpm: 0,
    baseline_oxygen_lpm: 0,
  },
  pending_diagnostics: {
    critical_results_pending: false,
    pending_items: [],
  },
  medication_reconciliation: {
    reconciliation_complete: true,
    unresolved_issues: [],
  },
  follow_up_and_referrals: {
    appointments_scheduled: true,
    missing_referrals: [],
  },
  patient_education: {
    teach_back_complete: true,
    documented_gaps: [],
  },
  home_support_and_services: {
    caregiver_confirmed: true,
    services_confirmed: true,
    documented_gaps: [],
  },
  equipment_and_transport: {
    transport_confirmed: true,
    equipment_ready: true,
    documented_gaps: [],
  },
  administrative_and_documentation: {
    discharge_documents_complete: true,
    documented_gaps: [],
  },
  evidence_catalog: [
    {
      id: "phase2_det_001",
      source_type: "structured",
      source_label: "Structured resting snapshot",
      detail: "Vitals stable on room air at rest and all discharge checklist fields complete.",
      category: "clinical_stability",
      assertion: "supports_readiness",
    },
  ],
};

const buildHiddenRiskInputFromDeterministicOutput = (
  deterministic: ReturnType<typeof assessDischargeReadinessV1>,
  fixture: HiddenRiskInput,
): HiddenRiskInput => ({
  deterministic_snapshot: {
    patient_id: fixture.deterministic_snapshot.patient_id,
    encounter_id: fixture.deterministic_snapshot.encounter_id,
    baseline_verdict: deterministic.verdict,
    deterministic_blockers: deterministic.blockers.map((blocker) => ({
      blocker_id: blocker.id,
      category: blocker.category,
      description: blocker.description,
      severity: blocker.priority,
    })),
    deterministic_evidence: deterministic.evidence.map((evidence) => ({
      evidence_id: evidence.id,
      source_label: evidence.source_label,
      detail: evidence.detail,
    })),
    deterministic_next_steps: deterministic.next_steps.map((step) => step.action),
    deterministic_summary: deterministic.summary,
  },
  narrative_evidence_bundle: fixture.narrative_evidence_bundle,
  optional_context_metadata: fixture.optional_context_metadata,
});

const buildBaselineFinalPostureLine = (
  baselineVerdict: "ready" | "ready_with_caveats" | "not_ready",
  finalVerdict: "ready" | "ready_with_caveats" | "not_ready",
): string => {
  return `Structured baseline verdict: ${baselineVerdict} -> final reconciled verdict: ${finalVerdict}.`;
};

const buildTrapHiddenRiskInputFromStructuredOutput = () => {
  const deterministic = assessDischargeReadinessV1(PHASE2_TRAP_STRUCTURED_BASELINE);
  assert.equal(deterministic.verdict, "ready", "Phase 2 trap baseline must remain structured-ready.");
  assert.equal(
    deterministic.blockers.length,
    0,
    "Phase 2 trap baseline must have no deterministic blockers before hidden-risk escalation.",
  );
  assert.ok(
    deterministic.summary.includes("Structured baseline posture:"),
    "Phase 2 trap baseline summary must keep deterministic posture visibility explicit.",
  );

  return {
    deterministic,
    hiddenRiskInput: buildHiddenRiskInputFromDeterministicOutput(deterministic, PHASE0_TRAP_PATIENT_INPUT),
  };
};

const reconcileFinalVerdict = (
  deterministicVerdict: "ready" | "ready_with_caveats" | "not_ready",
  hiddenRiskStatus: string,
  hiddenRiskResult: string,
  hiddenRiskImpact: "none" | "caveat" | "not_ready" | "uncertain",
): "ready" | "ready_with_caveats" | "not_ready" => {
  if (hiddenRiskStatus === "error" || hiddenRiskStatus === "insufficient_context") {
    return deterministicVerdict;
  }

  if (hiddenRiskResult === "hidden_risk_present" && hiddenRiskImpact === "not_ready") {
    return "not_ready";
  }

  if (deterministicVerdict === "ready" && hiddenRiskResult === "inconclusive") {
    return "ready_with_caveats";
  }

  if (
    deterministicVerdict === "ready" &&
    hiddenRiskResult === "hidden_risk_present" &&
    hiddenRiskImpact === "caveat"
  ) {
    return "ready_with_caveats";
  }

  return deterministicVerdict;
};

const assertFindingCitationTraceability = (
  citationIds: string[],
  knownCitationIds: Set<string>,
  findingId: string,
): void => {
  assert.ok(citationIds.length > 0, `Finding ${findingId} must include at least one citation id.`);
  for (const citationId of citationIds) {
    assert.ok(
      knownCitationIds.has(citationId),
      `Finding ${findingId} references unknown citation id ${citationId}.`,
    );
  }
};

const assertTrapHiddenRiskEscalationAndStoryStrength = async (): Promise<void> => {
  const { deterministic, hiddenRiskInput } = buildTrapHiddenRiskInputFromStructuredOutput();
  const hiddenRisk = await surfaceHiddenRisks(hiddenRiskInput);
  const payload = hiddenRisk.payload;

  assert.equal(payload.status, "ok");
  assert.equal(payload.hidden_risk_summary.result, "hidden_risk_present");
  assert.equal(payload.hidden_risk_summary.overall_disposition_impact, "not_ready");

  const categories = new Set(payload.hidden_risk_findings.map((finding) => finding.category));
  assert.ok(categories.has("clinical_stability"));
  assert.ok(categories.has("equipment_and_transport"));
  assert.ok(categories.has("home_support_and_services"));

  const citationIds = new Set(payload.citations.map((citation) => citation.citation_id));
  for (const finding of payload.hidden_risk_findings) {
    assertFindingCitationTraceability(finding.citation_ids, citationIds, finding.finding_id);
  }
  for (const citation of payload.citations) {
    assert.ok(citation.locator.trim().length > 0, `Citation ${citation.citation_id} must include a locator.`);
    assert.ok(citation.excerpt.trim().length > 0, `Citation ${citation.citation_id} must include an excerpt.`);
  }

  const sourceLabels = payload.citations.map((citation) => citation.source_label);
  assert.ok(
    sourceLabels.some((label) => label.includes("Nursing Note 2026-04-18 20:40")),
    "Trap contradiction must cite the canonical nursing note.",
  );
  assert.ok(
    sourceLabels.some((label) => label.includes("Case Management Addendum 2026-04-18 20:55")),
    "Trap contradiction must cite the canonical case-management addendum.",
  );

  const finalVerdict = reconcileFinalVerdict(
    deterministic.verdict,
    payload.status,
    payload.hidden_risk_summary.result,
    payload.hidden_risk_summary.overall_disposition_impact,
  );
  assert.equal(finalVerdict, "not_ready");

  const parseable = JSON.parse(JSON.stringify(payload));
  assert.equal(parseable.hidden_risk_summary.result, "hidden_risk_present");

  const prompt1Proof = {
    baseline_structured_verdict: deterministic.verdict,
    final_manual_two_mcp_verdict: finalVerdict,
    baseline_vs_final_posture_line: buildBaselineFinalPostureLine(deterministic.verdict, finalVerdict),
    contradiction_visible: payload.hidden_risk_summary.summary.length > 0,
  };
  assert.equal(prompt1Proof.baseline_structured_verdict, "ready");
  assert.equal(prompt1Proof.final_manual_two_mcp_verdict, "not_ready");
  assert.ok(
    prompt1Proof.baseline_vs_final_posture_line.includes("ready -> final reconciled verdict: not_ready"),
    "Prompt 1 posture line must make baseline-vs-final escalation explicit.",
  );
  assert.equal(prompt1Proof.contradiction_visible, true);

  const prompt2Proof = {
    contradiction_categories: [...categories],
    contradiction_citations: payload.citations.length,
  };
  assert.equal(prompt2Proof.contradiction_citations > 0, true);
};

const assertTrapEscalationIsNoteDependent = async (): Promise<void> => {
  const { deterministic } = buildTrapHiddenRiskInputFromStructuredOutput();
  const ablatedInput = buildHiddenRiskInputFromDeterministicOutput(
    deterministic,
    MARIA_ALVAREZ_ABLATION_INPUT,
  );

  const hiddenRisk = await surfaceHiddenRisks(ablatedInput);
  const finalVerdict = reconcileFinalVerdict(
    deterministic.verdict,
    hiddenRisk.payload.status,
    hiddenRisk.payload.hidden_risk_summary.result,
    hiddenRisk.payload.hidden_risk_summary.overall_disposition_impact,
  );

  assert.equal(
    hiddenRisk.payload.hidden_risk_summary.result,
    "no_hidden_risk",
    "Trap escalation must depend on contradiction notes.",
  );
  assert.equal(hiddenRisk.payload.hidden_risk_findings.length, 0);
  assert.equal(finalVerdict, "ready");
};

const assertAlternativeHiddenRiskEscalation = async (): Promise<void> => {
  const deterministic = assessDischargeReadinessV1(PHASE2_TRAP_STRUCTURED_BASELINE);
  const hiddenRiskInput = buildHiddenRiskInputFromDeterministicOutput(
    deterministic,
    ALTERNATIVE_HIDDEN_RISK_INPUT,
  );

  const hiddenRisk = await surfaceHiddenRisks(hiddenRiskInput);
  assert.equal(hiddenRisk.payload.status, "ok");
  assert.equal(hiddenRisk.payload.hidden_risk_summary.result, "hidden_risk_present");
  assert.equal(hiddenRisk.payload.hidden_risk_findings.length > 0, true);

  const categories = new Set(hiddenRisk.payload.hidden_risk_findings.map((finding) => finding.category));
  assert.deepEqual([...categories], ["home_support_and_services"]);
  assert.equal(
    hiddenRisk.payload.citations.some((citation) => citation.source_label.includes("Case Management Escalation Note 2026-04-18 21:05")),
    true,
  );

  const finalVerdict = reconcileFinalVerdict(
    deterministic.verdict,
    hiddenRisk.payload.status,
    hiddenRisk.payload.hidden_risk_summary.result,
    hiddenRisk.payload.hidden_risk_summary.overall_disposition_impact,
  );
  assert.equal(finalVerdict, "not_ready");
};

const assertDuplicateSignalRemainsBounded = async (): Promise<void> => {
  const deterministic = assessDischargeReadinessV1(FIRST_SYNTHETIC_SCENARIO_V1);
  const hiddenRiskInput = buildHiddenRiskInputFromDeterministicOutput(
    deterministic,
    DUPLICATE_SIGNAL_CONTROL_INPUT,
  );

  const hiddenRisk = await surfaceHiddenRisks(hiddenRiskInput);
  assert.equal(hiddenRisk.payload.status, "ok");
  assert.equal(hiddenRisk.payload.hidden_risk_summary.result, "no_hidden_risk");
  assert.equal(hiddenRisk.payload.hidden_risk_findings.length, 0);
  assert.equal(hiddenRisk.payload.citations.length, 0);
  assert.ok(
    hiddenRisk.payload.review_metadata.duplicate_findings_suppressed > 0,
    "Duplicate hidden-risk signal should be suppressed when deterministic blocker already exists.",
  );

  const finalVerdict = reconcileFinalVerdict(
    deterministic.verdict,
    hiddenRisk.payload.status,
    hiddenRisk.payload.hidden_risk_summary.result,
    hiddenRisk.payload.hidden_risk_summary.overall_disposition_impact,
  );
  assert.equal(finalVerdict, deterministic.verdict);
};

const assertCleanControlRemainsBounded = async (): Promise<void> => {
  const hiddenRisk = await surfaceHiddenRisks(NO_RISK_CONTROL_INPUT);
  const payload = hiddenRisk.payload;

  assert.equal(payload.status, "ok");
  assert.equal(payload.hidden_risk_summary.result, "no_hidden_risk");
  assert.equal(payload.hidden_risk_summary.overall_disposition_impact, "none");
  assert.equal(payload.hidden_risk_findings.length, 0);
  assert.equal(payload.hidden_risk_summary.manual_review_required, false);

  const finalVerdict = reconcileFinalVerdict(
    NO_RISK_CONTROL_INPUT.deterministic_snapshot.baseline_verdict,
    payload.status,
    payload.hidden_risk_summary.result,
    payload.hidden_risk_summary.overall_disposition_impact,
  );
  assert.equal(finalVerdict, "ready");
};

const assertFallbackWhenClinicalIntelligenceIsUnavailable = async (): Promise<void> => {
  const { deterministic, hiddenRiskInput } = buildTrapHiddenRiskInputFromStructuredOutput();
  const malformedClient: HiddenRiskLlmClient = {
    generateHiddenRiskResponse: async () => ({
      provider: "heuristic",
      rawText: "not-json",
    }),
  };

  const hiddenRisk = await surfaceHiddenRisks(hiddenRiskInput, {
    llmClientOverride: malformedClient,
  });

  assert.equal(hiddenRisk.payload.status, "error");
  assert.ok(hiddenRisk.payload.hidden_risk_summary.summary.includes("clinical_intelligence_unavailable"));

  const fallbackVerdict = reconcileFinalVerdict(
    deterministic.verdict,
    hiddenRisk.payload.status,
    hiddenRisk.payload.hidden_risk_summary.result,
    hiddenRisk.payload.hidden_risk_summary.overall_disposition_impact,
  );

  assert.equal(
    fallbackVerdict,
    "ready",
    "When clinical intelligence is unavailable, fallback keeps deterministic verdict.",
  );
};

const assertInconclusiveHiddenRiskRemainsBoundedAndHonest = async (): Promise<void> => {
  const deterministic = assessDischargeReadinessV1(PHASE2_TRAP_STRUCTURED_BASELINE);
  const hiddenRiskInput = buildHiddenRiskInputFromDeterministicOutput(
    deterministic,
    INCONCLUSIVE_CONTEXT_INPUT,
  );

  const hiddenRisk = await surfaceHiddenRisks(hiddenRiskInput);
  assert.equal(hiddenRisk.payload.status, "insufficient_context");
  assert.equal(hiddenRisk.payload.hidden_risk_summary.result, "inconclusive");
  assert.equal(hiddenRisk.payload.hidden_risk_summary.manual_review_required, true);
  assert.equal(hiddenRisk.payload.hidden_risk_findings.length, 0);
  assert.equal(hiddenRisk.payload.citations.length, 0);

  const finalVerdict = reconcileFinalVerdict(
    deterministic.verdict,
    hiddenRisk.payload.status,
    hiddenRisk.payload.hidden_risk_summary.result,
    hiddenRisk.payload.hidden_risk_summary.overall_disposition_impact,
  );
  assert.equal(finalVerdict, "ready");
};

const main = async (): Promise<void> => {
  await assertTrapHiddenRiskEscalationAndStoryStrength();
  await assertTrapEscalationIsNoteDependent();
  await assertAlternativeHiddenRiskEscalation();
  await assertDuplicateSignalRemainsBounded();
  await assertCleanControlRemainsBounded();
  await assertInconclusiveHiddenRiskRemainsBoundedAndHonest();
  await assertFallbackWhenClinicalIntelligenceIsUnavailable();

  console.log("SMOKE PASS: phase2 two-MCP integration");
};

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
