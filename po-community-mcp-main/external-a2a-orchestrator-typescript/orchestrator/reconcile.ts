import {
  A2ATaskInput,
  DeterministicResponse,
  HiddenRiskResponse,
  ReconciliationResult,
} from "../types";
import { applyDecisionMatrix } from "./decision-matrix";

const toHiddenRiskResult = (
  hiddenRisk: HiddenRiskResponse | null,
): { result: "hidden_risk_present" | "no_hidden_risk" | "inconclusive"; impact: "none" | "caveat" | "not_ready" | "uncertain"; runStatus: ReconciliationResult["hidden_risk_run_status"] } => {
  if (!hiddenRisk) {
    return {
      result: "inconclusive",
      impact: "uncertain",
      runStatus: "unavailable",
    };
  }

  if (hiddenRisk.status === "error" || hiddenRisk.status === "insufficient_context") {
    return {
      result: "inconclusive",
      impact: "uncertain",
      runStatus: "unavailable",
    };
  }

  if (hiddenRisk.status === "inconclusive") {
    return {
      result: "inconclusive",
      impact: "uncertain",
      runStatus: "inconclusive",
    };
  }

  return {
    result: hiddenRisk.hidden_risk_summary.result,
    impact: hiddenRisk.hidden_risk_summary.overall_disposition_impact,
    runStatus: "used",
  };
};

const buildMergedBlockers = (
  deterministic: DeterministicResponse,
  hiddenRisk: HiddenRiskResponse | null,
): ReconciliationResult["merged_blockers"] => {
  const deterministicBlockers = deterministic.blockers.map((blocker) => ({
    id: blocker.id,
    source: "deterministic" as const,
    category: blocker.category,
    severity: blocker.priority,
    description: blocker.description,
    evidence_ids: blocker.evidence,
  }));

  if (!hiddenRisk || hiddenRisk.status === "error" || hiddenRisk.status === "insufficient_context") {
    return deterministicBlockers;
  }

  const hiddenRiskBlockers = hiddenRisk.hidden_risk_findings
    .filter((finding) => finding.recommended_orchestrator_action !== "ignore_duplicate")
    .map((finding) => ({
      id: finding.finding_id,
      source: "hidden_risk" as const,
      category: finding.category,
      severity: finding.disposition_impact === "not_ready" ? "high" : "medium",
      description: finding.rationale,
      evidence_ids: finding.citation_ids,
    }));

  return [...deterministicBlockers, ...hiddenRiskBlockers];
};

const buildMergedNextSteps = (
  deterministic: DeterministicResponse,
  hiddenRisk: HiddenRiskResponse | null,
): ReconciliationResult["merged_next_steps"] => {
  const deterministicSteps = deterministic.next_steps.map((step) => ({
    id: step.id,
    source: "deterministic" as const,
    priority: step.priority,
    action: step.action,
  }));

  if (!hiddenRisk || hiddenRisk.status !== "ok") {
    return deterministicSteps;
  }

  const hiddenRiskSteps = hiddenRisk.hidden_risk_findings
    .filter((finding) => finding.recommended_orchestrator_action !== "ignore_duplicate")
    .map((finding) => ({
      id: `${finding.finding_id}_action`,
      source: "hidden_risk" as const,
      priority: finding.disposition_impact === "not_ready" ? "high" : "medium",
      action: `Resolve hidden risk: ${finding.title}`,
    }));

  return [...deterministicSteps, ...hiddenRiskSteps];
};

const buildContradictionSummary = (
  deterministic: DeterministicResponse,
  hiddenRisk: HiddenRiskResponse | null,
): string => {
  if (!hiddenRisk) {
    return "Hidden-risk review unavailable; deterministic posture preserved.";
  }

  if (hiddenRisk.status === "error") {
    return hiddenRisk.hidden_risk_summary.summary;
  }

  if (hiddenRisk.status === "insufficient_context") {
    return hiddenRisk.hidden_risk_summary.summary;
  }

  if (hiddenRisk.status === "inconclusive") {
    return hiddenRisk.hidden_risk_summary.summary;
  }

  if (hiddenRisk.hidden_risk_summary.result === "hidden_risk_present") {
    return `Structured baseline '${deterministic.verdict}' changed by narrative contradiction: ${hiddenRisk.hidden_risk_summary.summary}`;
  }

  return hiddenRisk.hidden_risk_summary.summary;
};

export const reconcileOutputs = (
  taskInput: A2ATaskInput,
  deterministic: DeterministicResponse,
  hiddenRisk: HiddenRiskResponse | null,
): ReconciliationResult => {
  const hiddenRiskState = toHiddenRiskResult(hiddenRisk);
  const decision = applyDecisionMatrix(
    deterministic.verdict,
    hiddenRiskState.result,
    hiddenRiskState.impact,
  );

  const manualReviewRequired =
    decision.manualReviewRequired ||
    (hiddenRisk?.hidden_risk_summary.manual_review_required ?? false);

  const unavailableReason =
    hiddenRisk && hiddenRisk.status === "error"
      ? hiddenRisk.hidden_risk_summary.summary
      : undefined;

  return {
    final_verdict: decision.finalVerdict,
    manual_review_required: manualReviewRequired,
    decision_matrix_row: decision.row,
    decision_matrix_action: decision.action,
    hidden_risk_run_status: hiddenRiskState.runStatus,
    hidden_risk_result: hiddenRiskState.result,
    hidden_risk_disposition_impact: hiddenRiskState.impact,
    deterministic,
    hidden_risk: hiddenRisk,
    merged_blockers: buildMergedBlockers(deterministic, hiddenRisk),
    merged_next_steps: buildMergedNextSteps(deterministic, hiddenRisk),
    citations: {
      deterministic: deterministic.evidence.map((evidence) => ({
        id: evidence.id,
        source_label: evidence.source_label,
        detail: evidence.detail,
      })),
      hidden_risk: hiddenRisk?.citations || [],
    },
    contradiction_summary: buildContradictionSummary(deterministic, hiddenRisk),
    hidden_risk_unavailable_reason: unavailableReason,
  };
};
