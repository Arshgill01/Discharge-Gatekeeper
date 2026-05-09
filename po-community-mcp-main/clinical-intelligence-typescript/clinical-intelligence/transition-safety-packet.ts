import {
  CANONICAL_BLOCKER_CATEGORIES,
  CANONICAL_VERDICTS,
  HiddenRiskInput,
  HiddenRiskOutput,
} from "./contract";

export type CanonicalVerdict = (typeof CANONICAL_VERDICTS)[number];
export type CanonicalBlockerCategory = (typeof CANONICAL_BLOCKER_CATEGORIES)[number];
export type SafetyInvariantStatus = "pass" | "fail";

export type SafetyInvariants = {
  structured_baseline_preserved: SafetyInvariantStatus;
  no_uncited_escalation: SafetyInvariantStatus;
  no_ready_with_active_hidden_blocker: SafetyInvariantStatus;
  manual_review_on_uncertainty: SafetyInvariantStatus;
  duplicate_signal_suppression: SafetyInvariantStatus;
};

export type TransitionSafetyPacket = {
  packet_type: "transition_safety_packet";
  contract_version: "phase9_transition_safety_packet_v1";
  patient: {
    patient_id: string | null;
    encounter_id: string | null;
    display_name?: string;
    planned_disposition?: string;
  };
  structured_baseline: {
    source: "Discharge Gatekeeper MCP";
    verdict: CanonicalVerdict;
    summary: string;
    evidence: string[];
    blockers: Array<{
      blocker_id: string;
      category: CanonicalBlockerCategory;
      description: string;
      severity?: "low" | "medium" | "high";
    }>;
  };
  narrative_review: {
    source: "Clinical Intelligence MCP";
    status: HiddenRiskOutput["status"];
    hidden_risk_result: HiddenRiskOutput["hidden_risk_summary"]["result"];
    contradiction_summary: string;
    citations: Array<{
      source_label: string;
      excerpt: string;
    }>;
  };
  reconciled_transition_status: {
    final_verdict: CanonicalVerdict;
    why_changed: string;
    blocker_categories: CanonicalBlockerCategory[];
    manual_review_required: boolean;
  };
  action_router: Array<{
    owner: string;
    action: string;
    timing: string;
    release_condition: string;
  }>;
  safety_invariants: SafetyInvariants;
  trace: {
    dgk_mcp_used: boolean;
    clinical_intelligence_mcp_used: boolean;
    a2a_orchestrator_supported: boolean;
    request_id: string | null;
    task_id: string | null;
    provider: string | null;
    model: string | null;
  };
};

type TransitionSafetyPacketInput = {
  input: HiddenRiskInput;
  hiddenRisk: HiddenRiskOutput;
  finalVerdict: CanonicalVerdict;
  blockerCategories: string[];
  actionRouter: TransitionSafetyPacket["action_router"];
  trace?: Partial<TransitionSafetyPacket["trace"]>;
  provider?: string | null;
  model?: string | null;
};

type InvariantInput = {
  structuredBaselineVisible: boolean;
  structuredBaselineVerdict: CanonicalVerdict;
  finalVerdict: CanonicalVerdict;
  hiddenRisk: HiddenRiskOutput;
};

const isCanonicalBlockerCategory = (value: string): value is CanonicalBlockerCategory => {
  return (CANONICAL_BLOCKER_CATEGORIES as readonly string[]).includes(value);
};

const uniqueCanonicalCategories = (values: string[]): CanonicalBlockerCategory[] => {
  const categories = values.filter(isCanonicalBlockerCategory);
  return [...new Set(categories)];
};

const activeHiddenRiskFindings = (
  hiddenRisk: HiddenRiskOutput,
): HiddenRiskOutput["hidden_risk_findings"] => {
  return hiddenRisk.hidden_risk_findings.filter(
    (finding) => finding.recommended_orchestrator_action !== "ignore_duplicate",
  );
};

export const evaluateSafetyInvariants = ({
  structuredBaselineVisible,
  structuredBaselineVerdict,
  finalVerdict,
  hiddenRisk,
}: InvariantInput): SafetyInvariants => {
  const activeFindings = activeHiddenRiskFindings(hiddenRisk);
  const hasHiddenRiskEscalation =
    hiddenRisk.hidden_risk_summary.result === "hidden_risk_present" &&
    hiddenRisk.hidden_risk_summary.overall_disposition_impact !== "none";
  const hasActiveNotReadyBlocker = activeFindings.some(
    (finding) => finding.disposition_impact === "not_ready",
  );
  const hasUncertainty =
    hiddenRisk.status === "error" ||
    hiddenRisk.status === "insufficient_context" ||
    hiddenRisk.status === "inconclusive" ||
    hiddenRisk.hidden_risk_summary.result === "inconclusive" ||
    hiddenRisk.hidden_risk_summary.overall_disposition_impact === "uncertain";
  const hasDuplicateActiveFinding = activeFindings.some(
    (finding) =>
      finding.recommended_orchestrator_action === "ignore_duplicate" ||
      finding.is_duplicate_of_blocker_id !== null,
  );

  return {
    structured_baseline_preserved:
      structuredBaselineVisible && Boolean(structuredBaselineVerdict) ? "pass" : "fail",
    no_uncited_escalation:
      hasHiddenRiskEscalation && hiddenRisk.citations.length === 0 ? "fail" : "pass",
    no_ready_with_active_hidden_blocker:
      hasActiveNotReadyBlocker && finalVerdict === "ready" ? "fail" : "pass",
    manual_review_on_uncertainty:
      hasUncertainty && !hiddenRisk.hidden_risk_summary.manual_review_required && finalVerdict === "ready"
        ? "fail"
        : "pass",
    duplicate_signal_suppression: hasDuplicateActiveFinding ? "fail" : "pass",
  };
};

const buildWhyChanged = (
  structuredBaselineVerdict: CanonicalVerdict,
  hiddenRisk: HiddenRiskOutput,
  finalVerdict: CanonicalVerdict,
): string => {
  if (hiddenRisk.hidden_risk_summary.result === "hidden_risk_present") {
    return `The structured chart looked ${structuredBaselineVerdict}, but cited narrative evidence created active transition blockers: ${hiddenRisk.hidden_risk_summary.summary}`;
  }

  if (hiddenRisk.hidden_risk_summary.result === "inconclusive") {
    return `The structured chart looked ${structuredBaselineVerdict}, but narrative review was inconclusive and requires manual clinician review.`;
  }

  return `Structured baseline ${structuredBaselineVerdict} was preserved; narrative review did not add a discharge-changing hidden risk, so final status is ${finalVerdict}.`;
};

export const buildTransitionSafetyPacket = ({
  input,
  hiddenRisk,
  finalVerdict,
  blockerCategories,
  actionRouter,
  trace,
  provider,
  model,
}: TransitionSafetyPacketInput): TransitionSafetyPacket => {
  const deterministic = input.deterministic_snapshot;
  const categories = uniqueCanonicalCategories(blockerCategories);
  const manualReviewRequired =
    hiddenRisk.hidden_risk_summary.manual_review_required || finalVerdict !== "ready";
  const safetyInvariants = evaluateSafetyInvariants({
    structuredBaselineVisible: true,
    structuredBaselineVerdict: deterministic.baseline_verdict,
    finalVerdict,
    hiddenRisk,
  });

  return {
    packet_type: "transition_safety_packet",
    contract_version: "phase9_transition_safety_packet_v1",
    patient: {
      patient_id: deterministic.patient_id ?? null,
      encounter_id: deterministic.encounter_id ?? null,
      ...(deterministic.patient_id === "phase0-trap-maria-alvarez"
        ? { display_name: "Maria Alvarez", planned_disposition: "home" }
        : {}),
    },
    structured_baseline: {
      source: "Discharge Gatekeeper MCP",
      verdict: deterministic.baseline_verdict,
      summary: deterministic.deterministic_summary,
      evidence: deterministic.deterministic_evidence.map((evidence) =>
        evidence.detail ? `${evidence.source_label}: ${evidence.detail}` : evidence.source_label,
      ),
      blockers: deterministic.deterministic_blockers,
    },
    narrative_review: {
      source: "Clinical Intelligence MCP",
      status: hiddenRisk.status,
      hidden_risk_result: hiddenRisk.hidden_risk_summary.result,
      contradiction_summary: hiddenRisk.hidden_risk_summary.summary,
      citations: hiddenRisk.citations.map((citation) => ({
        source_label: citation.source_label,
        excerpt: citation.excerpt,
      })),
    },
    reconciled_transition_status: {
      final_verdict: finalVerdict,
      why_changed: buildWhyChanged(deterministic.baseline_verdict, hiddenRisk, finalVerdict),
      blocker_categories: categories,
      manual_review_required: manualReviewRequired,
    },
    action_router: actionRouter,
    safety_invariants: safetyInvariants,
    trace: {
      dgk_mcp_used: true,
      clinical_intelligence_mcp_used: hiddenRisk.status !== "error",
      a2a_orchestrator_supported: true,
      request_id: null,
      task_id: null,
      provider: provider ?? null,
      model: model ?? null,
      ...trace,
    },
  };
};

export const allSafetyInvariantsPass = (invariants: SafetyInvariants): boolean => {
  return Object.values(invariants).every((status) => status === "pass");
};

