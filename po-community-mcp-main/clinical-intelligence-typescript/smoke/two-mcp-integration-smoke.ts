import assert from "node:assert/strict";
import {
  assessDischargeReadinessV1,
} from "../../typescript/discharge-readiness/assess-discharge-readiness";
import {
  ReadinessInput,
} from "../../typescript/discharge-readiness/contract";
import { HiddenRiskLlmClient } from "../llm/client";
import { surfaceHiddenRisks } from "../clinical-intelligence/surface-hidden-risks";
import { PHASE0_TRAP_PATIENT_INPUT } from "../clinical-intelligence/fixtures";

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

const buildHiddenRiskInputFromStructuredOutput = () => {
  const deterministic = assessDischargeReadinessV1(PHASE2_TRAP_STRUCTURED_BASELINE);
  assert.equal(deterministic.verdict, "ready", "Phase 2 trap baseline must remain structured-ready.");
  assert.equal(
    deterministic.blockers.length,
    0,
    "Phase 2 trap baseline must have no deterministic blockers before hidden-risk escalation.",
  );

  return {
    deterministic,
    hiddenRiskInput: {
      deterministic_snapshot: {
        patient_id: PHASE0_TRAP_PATIENT_INPUT.deterministic_snapshot.patient_id,
        encounter_id: PHASE0_TRAP_PATIENT_INPUT.deterministic_snapshot.encounter_id,
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
      narrative_evidence_bundle: PHASE0_TRAP_PATIENT_INPUT.narrative_evidence_bundle,
      optional_context_metadata: PHASE0_TRAP_PATIENT_INPUT.optional_context_metadata,
    },
  };
};

const assertHiddenRiskEscalation = async (): Promise<void> => {
  const { deterministic, hiddenRiskInput } = buildHiddenRiskInputFromStructuredOutput();
  const hiddenRisk = await surfaceHiddenRisks(hiddenRiskInput);

  assert.equal(hiddenRisk.payload.status, "ok");
  assert.equal(hiddenRisk.payload.hidden_risk_summary.result, "hidden_risk_present");
  assert.equal(hiddenRisk.payload.hidden_risk_summary.overall_disposition_impact, "not_ready");

  const categories = new Set(hiddenRisk.payload.hidden_risk_findings.map((finding) => finding.category));
  assert.ok(categories.has("clinical_stability"));
  assert.ok(categories.has("equipment_and_transport"));
  assert.ok(categories.has("home_support_and_services"));

  const sourceLabels = hiddenRisk.payload.citations.map((citation) => citation.source_label);
  assert.ok(
    sourceLabels.some((label) => label.includes("Nursing Note 2026-04-18 20:40")),
    "Trap contradiction must cite the canonical nursing note.",
  );
  assert.ok(
    sourceLabels.some((label) => label.includes("Case Management Addendum 2026-04-18 20:55")),
    "Trap contradiction must cite the canonical case-management addendum.",
  );

  const finalVerdict =
    hiddenRisk.payload.hidden_risk_summary.overall_disposition_impact === "not_ready"
      ? "not_ready"
      : deterministic.verdict;
  assert.equal(finalVerdict, "not_ready");
};

const assertFallbackWhenClinicalIntelligenceIsUnavailable = async (): Promise<void> => {
  const { deterministic, hiddenRiskInput } = buildHiddenRiskInputFromStructuredOutput();
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
  assert.ok(
    hiddenRisk.payload.hidden_risk_summary.summary.includes("clinical_intelligence_unavailable"),
  );

  const fallbackVerdict = deterministic.verdict;
  assert.equal(
    fallbackVerdict,
    "ready",
    "When clinical intelligence is unavailable, fallback keeps deterministic verdict.",
  );
};

const main = async (): Promise<void> => {
  await assertHiddenRiskEscalation();
  await assertFallbackWhenClinicalIntelligenceIsUnavailable();

  console.log("SMOKE PASS: phase2 two-MCP integration");
};

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
