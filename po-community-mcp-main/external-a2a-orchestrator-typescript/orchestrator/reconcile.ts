import {
  A2ATaskInput,
  DeterministicResponse,
  HiddenRiskResponse,
  ReconciliationResult,
} from "../types";
import { HiddenRiskInput, HiddenRiskOutput } from "../../clinical-intelligence-typescript/clinical-intelligence/contract";
import { buildTransitionSafetyPacket } from "../../clinical-intelligence-typescript/clinical-intelligence/transition-safety-packet";
import { applyDecisionMatrix } from "./decision-matrix";
import { BlockerCategory, BlockerPriority } from "../../typescript/discharge-readiness/contract";
import {
  buildHiddenRiskTransitionAction,
  CATEGORY_LABEL,
  getTransitionTimingHint,
  OWNER_BY_CATEGORY,
} from "../../typescript/discharge-readiness/transition-scaffolding";

const detectPromptMode = (prompt: string): ReconciliationResult["prompt_payload"]["prompt_mode"] => {
  const normalized = prompt.toLowerCase();
  if (normalized.includes("hidden risk") || normalized.includes("contradiction")) {
    return "prompt_2";
  }
  if (
    normalized.includes("must happen before discharge") ||
    normalized.includes("transition package")
  ) {
    return "prompt_3";
  }
  return "prompt_1";
};

const isCanonicalBlockerCategory = (value: string): value is BlockerCategory => {
  return value in CATEGORY_LABEL;
};

const toBlockerPriority = (value: string): BlockerPriority => {
  if (value === "low") {
    return "low";
  }
  if (value === "medium") {
    return "medium";
  }
  return "high";
};

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
  const deterministicBlockerById = new Map(
    deterministic.blockers.map((blocker) => [blocker.id, blocker]),
  );
  const deterministicEvidenceById = new Map(
    deterministic.evidence.map((evidence) => [evidence.id, evidence]),
  );
  const hiddenRiskCitationById = new Map(
    (hiddenRisk?.citations || []).map((citation) => [citation.citation_id, citation]),
  );

  const deterministicSteps = deterministic.next_steps.map((step) => ({
    id: step.id,
    source: "deterministic" as const,
    priority: step.priority,
    category:
      deterministicBlockerById.get(step.linked_blockers[0] || "")?.category ||
      "administrative_and_documentation",
    timing: getTransitionTimingHint(toBlockerPriority(step.priority)),
    owner: step.owner,
    action: step.action,
    rationale: step.trace_summary,
    linked_blockers: step.linked_blockers,
    linked_evidence: step.linked_evidence,
    citation_anchors: step.linked_evidence
      .map((evidenceId) => deterministicEvidenceById.get(evidenceId))
      .filter((evidence): evidence is DeterministicResponse["evidence"][number] => Boolean(evidence))
      .map((evidence) => ({
        id: evidence.id,
        source: "deterministic" as const,
        source_label: evidence.source_label,
        detail: evidence.detail,
      })),
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
      category: finding.category,
      timing: getTransitionTimingHint(
        finding.disposition_impact === "not_ready" ? "high" : "medium",
      ),
      owner: isCanonicalBlockerCategory(finding.category)
        ? OWNER_BY_CATEGORY[finding.category]
        : "Care team",
      action: isCanonicalBlockerCategory(finding.category)
        ? buildHiddenRiskTransitionAction(
            finding.category,
            finding.disposition_impact === "not_ready" ? "high" : "medium",
          )
        : `Resolve hidden risk before discharge: ${finding.title}`,
      rationale: finding.rationale,
      linked_blockers: [finding.finding_id],
      linked_evidence: finding.citation_ids,
      citation_anchors: finding.citation_ids
        .map((citationId) => hiddenRiskCitationById.get(citationId))
        .filter((citation): citation is HiddenRiskResponse["citations"][number] => Boolean(citation))
        .map((citation) => ({
          id: citation.citation_id,
          source: "hidden_risk" as const,
          source_label: citation.source_label,
          locator: citation.locator,
          detail: citation.excerpt,
        })),
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

const toHiddenRiskInput = (
  taskInput: A2ATaskInput,
  deterministic: DeterministicResponse,
): HiddenRiskInput => ({
  deterministic_snapshot: {
    patient_id: taskInput.patient_context?.patient_id ?? null,
    encounter_id: taskInput.patient_context?.encounter_id ?? null,
    baseline_verdict: deterministic.verdict,
    deterministic_blockers: deterministic.blockers
      .filter((blocker) => isCanonicalBlockerCategory(blocker.category))
      .map((blocker) => ({
        blocker_id: blocker.id,
        category: blocker.category as BlockerCategory,
        description: blocker.description,
        severity: toBlockerPriority(blocker.priority),
      })),
    deterministic_evidence: deterministic.evidence.map((evidence) => ({
      evidence_id: evidence.id,
      source_label: evidence.source_label,
      detail: evidence.detail,
    })),
    deterministic_next_steps: deterministic.next_steps.map((step) => step.action),
    deterministic_summary: deterministic.summary,
  },
  narrative_evidence_bundle: taskInput.patient_context?.narrative_evidence_bundle || [],
  optional_context_metadata: taskInput.patient_context?.optional_context_metadata,
});

const buildUnavailableHiddenRisk = (
  deterministic: DeterministicResponse,
  reason: string,
): HiddenRiskOutput => ({
  contract_version: "phase0_hidden_risk_v1",
  status: "insufficient_context",
  patient_id: null,
  encounter_id: null,
  baseline_verdict: deterministic.verdict,
  hidden_risk_summary: {
    result: "inconclusive",
    overall_disposition_impact: "uncertain",
    confidence: "low",
    summary: reason,
    manual_review_required: true,
    false_positive_guardrail:
      "No hidden-risk escalation is fabricated without Clinical Intelligence evidence.",
  },
  hidden_risk_findings: [],
  citations: [],
  review_metadata: {
    narrative_sources_reviewed: 0,
    duplicate_findings_suppressed: 0,
    weak_findings_suppressed: 0,
  },
});

const toClinicalHiddenRiskOutput = (
  hiddenRisk: HiddenRiskResponse,
): HiddenRiskOutput => ({
  ...hiddenRisk,
  hidden_risk_findings: hiddenRisk.hidden_risk_findings
    .filter((finding) => isCanonicalBlockerCategory(finding.category))
    .map((finding) => ({
      ...finding,
      category: finding.category as BlockerCategory,
    })),
});

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
  const promptMode = detectPromptMode(taskInput.prompt);
  const contradictionSummary = buildContradictionSummary(deterministic, hiddenRisk);
  const mergedNextSteps = buildMergedNextSteps(deterministic, hiddenRisk);
  const mergedBlockers = buildMergedBlockers(deterministic, hiddenRisk);
  const impactedBlockerCategories = [...new Set(mergedBlockers.map((blocker) => blocker.category))];
  const packetHiddenRisk = hiddenRisk
    ? toClinicalHiddenRiskOutput(hiddenRisk)
    : buildUnavailableHiddenRisk(
        deterministic,
        "Hidden-risk review unavailable; deterministic posture preserved and manual review is required if narrative evidence is needed.",
      );
  const transitionSafetyPacket = buildTransitionSafetyPacket({
    input: toHiddenRiskInput(taskInput, deterministic),
    hiddenRisk: packetHiddenRisk,
    finalVerdict: decision.finalVerdict,
    blockerCategories: impactedBlockerCategories,
    actionRouter: mergedNextSteps.slice(0, 5).map((step) => ({
      owner: step.owner,
      action: step.action,
      timing: step.timing,
      release_condition:
        step.priority === "high"
          ? "Resolve and document this blocker before discharge release."
          : "Complete before final clinician discharge review.",
    })),
  });
  const lastDispositionDowngradeBy = deterministic.verdict === "ready"
    ? decision.finalVerdict === "ready"
      ? "none"
      : "clinical_intelligence_mcp"
    : deterministic.verdict === "ready_with_caveats" && decision.finalVerdict === "not_ready"
    ? "clinical_intelligence_mcp"
    : "discharge_gatekeeper_mcp";

  return {
    final_verdict: decision.finalVerdict,
    manual_review_required: manualReviewRequired,
    decision_matrix_row: decision.row,
    decision_matrix_action: decision.action,
    last_disposition_downgrade_by: lastDispositionDowngradeBy,
    hidden_risk_run_status: hiddenRiskState.runStatus,
    hidden_risk_result: hiddenRiskState.result,
    hidden_risk_disposition_impact: hiddenRiskState.impact,
    deterministic,
    hidden_risk: hiddenRisk,
    merged_blockers: mergedBlockers,
    merged_next_steps: mergedNextSteps,
    citations: {
      deterministic: deterministic.evidence.map((evidence) => ({
        id: evidence.id,
        source_label: evidence.source_label,
        detail: evidence.detail,
      })),
      hidden_risk: hiddenRisk?.citations || [],
    },
    contradiction_summary: contradictionSummary,
    transition_safety_packet: transitionSafetyPacket,
    prompt_payload: {
      prompt_mode: promptMode,
      headline: `Structured baseline ${deterministic.verdict}; final verdict ${decision.finalVerdict}.`,
      baseline_structured_verdict: deterministic.verdict,
      final_verdict: decision.finalVerdict,
      structured_baseline_summary: deterministic.summary,
      reconciliation_summary: contradictionSummary,
      evidence_anchors: [],
      impacted_blocker_categories: impactedBlockerCategories,
      action_plan: promptMode === "prompt_3" ? mergedNextSteps.slice(0, 3) : [],
    },
    hidden_risk_unavailable_reason: unavailableReason,
  };
};
