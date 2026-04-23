import { z } from "zod";
import {
  CANONICAL_BLOCKER_CATEGORIES,
  CANONICAL_VERDICTS,
  HiddenRiskInput,
  HiddenRiskOutput,
  hiddenRiskInputSchema,
} from "./contract";
import { surfaceHiddenRisks } from "./surface-hidden-risks";

const narrativeActionSchema = z.object({
  action_id: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  action: z.string(),
  linked_categories: z.array(z.enum(CANONICAL_BLOCKER_CATEGORIES)),
  citation_ids: z.array(z.string()),
});

const narrativeOutputSchema = z.object({
  contract_version: z.literal("phase0_transition_narrative_v1"),
  status: z.enum(["ok", "inconclusive", "insufficient_context", "error"]),
  patient_id: z.string().nullable(),
  encounter_id: z.string().nullable(),
  baseline_verdict: z.enum(CANONICAL_VERDICTS),
  proposed_disposition: z.enum(CANONICAL_VERDICTS),
  narrative: z.string(),
  key_points: z.array(z.string()),
  recommended_actions: z.array(narrativeActionSchema),
  citations: z.array(
    z.object({
      citation_id: z.string(),
      source_type: z.string(),
      source_label: z.string(),
      locator: z.string(),
      excerpt: z.string(),
    }),
  ),
  manual_review_required: z.boolean(),
  safety_boundary: z.string(),
});

export type TransitionNarrativeOutput = z.infer<typeof narrativeOutputSchema>;
type NarrativeAction = TransitionNarrativeOutput["recommended_actions"][number];

const actionTemplateByCategory: Record<
  (typeof CANONICAL_BLOCKER_CATEGORIES)[number],
  { action: string; priority: "high" | "medium" | "low" }
> = {
  clinical_stability: {
    priority: "high",
    action:
      "Owner now: bedside RN and covering clinician. Hold discharge and repeat exertional respiratory stability assessment before disposition.",
  },
  pending_diagnostics: {
    priority: "high",
    action:
      "Owner now: primary team. Complete or explicitly clear pending diagnostic items before discharge.",
  },
  medication_reconciliation: {
    priority: "medium",
    action:
      "Owner before discharge: primary team and pharmacist. Resolve medication reconciliation gaps and document the final discharge list.",
  },
  follow_up_and_referrals: {
    priority: "medium",
    action:
      "Owner before discharge: case management. Confirm required follow-up and referral appointments before discharge release.",
  },
  patient_education: {
    priority: "medium",
    action:
      "Owner before discharge: bedside RN. Reinforce discharge education with teach-back and document remaining comprehension gaps.",
  },
  home_support_and_services: {
    priority: "high",
    action:
      "Owner now: case management with family confirmation. Confirm overnight support and a safe home supervision plan before discharge.",
  },
  equipment_and_transport: {
    priority: "high",
    action:
      "Owner now: case management and vendor contact. Confirm required home equipment and transport logistics are active before discharge.",
  },
  administrative_and_documentation: {
    priority: "low",
    action:
      "Owner before discharge: primary team. Complete required discharge documentation and handoff artifacts.",
  },
};

const mapDisposition = (
  baselineVerdict: HiddenRiskInput["deterministic_snapshot"]["baseline_verdict"],
  hiddenRiskResult: string,
  dispositionImpact: string,
): HiddenRiskInput["deterministic_snapshot"]["baseline_verdict"] => {
  if (hiddenRiskResult === "hidden_risk_present" && dispositionImpact === "not_ready") {
    return "not_ready";
  }
  if (hiddenRiskResult === "hidden_risk_present" && dispositionImpact === "caveat") {
    return baselineVerdict === "ready" ? "ready_with_caveats" : baselineVerdict;
  }
  if (hiddenRiskResult === "hidden_risk_present" && dispositionImpact === "uncertain") {
    return baselineVerdict === "ready" ? "ready_with_caveats" : baselineVerdict;
  }
  if (hiddenRiskResult === "inconclusive") {
    return baselineVerdict === "ready" ? "ready_with_caveats" : baselineVerdict;
  }
  return baselineVerdict;
};

const rankPriority = (priority: "high" | "medium" | "low"): number => {
  if (priority === "high") {
    return 3;
  }
  if (priority === "medium") {
    return 2;
  }
  return 1;
};

const getCitationLabel = (
  citationId: string,
  citations: TransitionNarrativeOutput["citations"],
): string => {
  const citation = citations.find((item) => item.citation_id === citationId);
  if (!citation) {
    return citationId;
  }
  return `${citation.source_label} (${citation.locator}) [${citation.citation_id}]`;
};

const unique = <T>(values: T[]): T[] => [...new Set(values)];

const sortActionsByPriority = (actions: NarrativeAction[]): NarrativeAction[] => {
  return [...actions].sort((left, right) => rankPriority(right.priority) - rankPriority(left.priority));
};

const buildEvidenceAnchorLine = (
  findings: HiddenRiskOutput["hidden_risk_findings"],
  citations: TransitionNarrativeOutput["citations"],
): string => {
  const anchors = unique(
    findings.flatMap((finding) =>
      finding.citation_ids.map((citationId) => getCitationLabel(citationId, citations)),
    ),
  ).slice(0, 3);

  return anchors.length > 0 ? anchors.join("; ") : "No citation anchors available.";
};

const buildFinalPostureLine = (
  baselineVerdict: HiddenRiskInput["deterministic_snapshot"]["baseline_verdict"],
  proposedDisposition: TransitionNarrativeOutput["proposed_disposition"],
): string => {
  return `Final posture: ${proposedDisposition}. Baseline deterministic verdict was ${baselineVerdict}.`;
};

const buildPatientGuidanceLine = (
  proposedDisposition: TransitionNarrativeOutput["proposed_disposition"],
  hiddenRiskOutput: HiddenRiskOutput,
): string => {
  if (proposedDisposition === "not_ready") {
    return "Patient-facing guidance: Explain that discharge is on hold until the cited safety blockers are cleared and the clinical team confirms a safe transition.";
  }

  if (
    hiddenRiskOutput.status === "inconclusive" ||
    hiddenRiskOutput.hidden_risk_summary.manual_review_required
  ) {
    return "Patient-facing guidance: Explain that discharge timing remains under review until the clinical team resolves the uncertain narrative evidence.";
  }

  return "Patient-facing guidance: Continue standard discharge instructions and reinforce that final release depends on clinician sign-off.";
};

const buildHandoffBrief = (
  input: HiddenRiskInput,
  proposedDisposition: TransitionNarrativeOutput["proposed_disposition"],
  hiddenRiskOutput: HiddenRiskOutput,
): string => {
  if (hiddenRiskOutput.hidden_risk_findings.length === 0) {
    if (hiddenRiskOutput.hidden_risk_summary.manual_review_required) {
      return `Clinician handoff brief: structured baseline remained ${input.deterministic_snapshot.baseline_verdict}, but hidden-risk review status was ${hiddenRiskOutput.status}. Manual review is required before discharge.`;
    }

    return `Clinician handoff brief: structured baseline remained ${input.deterministic_snapshot.baseline_verdict}; no additional discharge-changing hidden risk was identified in the reviewed narrative evidence.`;
  }

  const topCategories = unique(
    hiddenRiskOutput.hidden_risk_findings.map((finding) => finding.category),
  ).join(", ");
  return `Clinician handoff brief: structured baseline was ${input.deterministic_snapshot.baseline_verdict}, but cited hidden-risk findings in ${topCategories} changed the working posture to ${proposedDisposition}.`;
};

const buildTopActionSummary = (actions: NarrativeAction[]): string => {
  const topActions = sortActionsByPriority(actions).slice(0, 3).map((action) => action.action);
  return topActions.length > 0
    ? `Top pre-discharge actions: ${topActions.join(" | ")}`
    : "Top pre-discharge actions: no additional actions generated.";
};

export const synthesizeTransitionNarrative = async (
  rawInput: unknown,
): Promise<TransitionNarrativeOutput> => {
  const parsed = hiddenRiskInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new Error(
      `Invalid input for synthesize_transition_narrative: ${parsed.error.message}`,
    );
  }
  const input = parsed.data;
  const hiddenRisk = await surfaceHiddenRisks(input);
  const hiddenRiskOutput = hiddenRisk.payload;

  const proposedDisposition = mapDisposition(
    input.deterministic_snapshot.baseline_verdict,
    hiddenRiskOutput.hidden_risk_summary.result,
    hiddenRiskOutput.hidden_risk_summary.overall_disposition_impact,
  );
  const evidenceAnchorLine = buildEvidenceAnchorLine(
    hiddenRiskOutput.hidden_risk_findings,
    hiddenRiskOutput.citations,
  );

  const keyPoints: string[] = [];
  keyPoints.push(buildFinalPostureLine(input.deterministic_snapshot.baseline_verdict, proposedDisposition));
  keyPoints.push(`Deterministic summary: ${input.deterministic_snapshot.deterministic_summary}`);
  keyPoints.push(
    `Hidden-risk review status: ${hiddenRiskOutput.status}; result: ${hiddenRiskOutput.hidden_risk_summary.result}; impact: ${hiddenRiskOutput.hidden_risk_summary.overall_disposition_impact}.`,
  );
  keyPoints.push(`Contradiction summary: ${hiddenRiskOutput.hidden_risk_summary.summary}`);

  for (const finding of hiddenRiskOutput.hidden_risk_findings) {
    const evidenceRefs = finding.citation_ids
      .map((citationId) => getCitationLabel(citationId, hiddenRiskOutput.citations))
      .join("; ");
    keyPoints.push(
      `${finding.category}: ${finding.title} (impact=${finding.disposition_impact}, confidence=${finding.confidence}, evidence=${evidenceRefs || "none"}).`,
    );
  }

  if (
    hiddenRiskOutput.hidden_risk_findings.length === 0 &&
    !hiddenRiskOutput.hidden_risk_summary.manual_review_required
  ) {
    keyPoints.push("No additional discharge-changing hidden risk was surfaced from notes.");
  } else if (hiddenRiskOutput.hidden_risk_findings.length === 0) {
    keyPoints.push(
      "No hidden-risk findings were emitted because the narrative review remained unresolved and requires manual review.",
    );
  }

  const actionAccumulator = new Map<string, NarrativeAction>();

  if (proposedDisposition === "not_ready") {
    actionAccumulator.set("posture_hold", {
      action_id: "posture_hold",
      priority: "high",
      action:
        "Owner now: primary team. Keep discharge on hold until the cited hidden-risk blockers are cleared and the safe transition plan is documented.",
      linked_categories: unique(hiddenRiskOutput.hidden_risk_findings.map((finding) => finding.category)),
      citation_ids: unique(
        hiddenRiskOutput.hidden_risk_findings.flatMap((finding) => finding.citation_ids),
      ).slice(0, 3),
    });
  }

  for (const finding of hiddenRiskOutput.hidden_risk_findings) {
    const template = actionTemplateByCategory[finding.category];
    const key = `hidden_${finding.category}`;
    const existing = actionAccumulator.get(key);
    const nextAction: NarrativeAction = {
      action_id: key,
      priority: existing
        ? rankPriority(existing.priority) >= rankPriority(template.priority)
          ? existing.priority
          : template.priority
        : template.priority,
      action: `${template.action} Evidence: ${finding.citation_ids
        .map((citationId) => getCitationLabel(citationId, hiddenRiskOutput.citations))
        .join("; ")}.`,
      linked_categories: unique([...(existing?.linked_categories || []), finding.category]),
      citation_ids: [...new Set([...(existing?.citation_ids || []), ...finding.citation_ids])],
    };
    actionAccumulator.set(key, nextAction);
  }

  const recommendedActions: NarrativeAction[] = [...actionAccumulator.values()];

  if (hiddenRiskOutput.hidden_risk_summary.manual_review_required) {
    recommendedActions.push({
      action_id: "action_manual_review",
      priority: "high",
      action: hiddenRiskOutput.status === "insufficient_context"
        ? "Owner now: primary clinician. Obtain the missing narrative evidence and complete manual review before discharge proceeds."
        : "Owner now: primary clinician. Resolve conflicting, low-confidence, or missing narrative evidence before discharge proceeds.",
      linked_categories: [
        ...new Set(hiddenRiskOutput.hidden_risk_findings.map((finding) => finding.category)),
      ],
      citation_ids: hiddenRiskOutput.citations.slice(0, 3).map((citation) => citation.citation_id),
    });
  }

  for (const [index, nextStep] of input.deterministic_snapshot.deterministic_next_steps.entries()) {
    recommendedActions.push({
      action_id: `action_det_${String(index + 1).padStart(3, "0")}`,
      priority: "medium",
      action: `Owner before discharge: discharge workflow team. Deterministic transition safeguard: ${nextStep}`,
      linked_categories: [],
      citation_ids: [],
    });

    if (hiddenRiskOutput.hidden_risk_findings.length > 0 && index >= 1) {
      break;
    }
  }

  const primaryFinding = hiddenRiskOutput.hidden_risk_findings[0];
  const narrative = primaryFinding
    ? `Final posture is ${proposedDisposition}. Hold discharge until the cited blockers are resolved. Structured baseline was ${input.deterministic_snapshot.baseline_verdict}, but narrative contradiction changed that answer: ${hiddenRiskOutput.hidden_risk_summary.summary} Evidence anchors: ${evidenceAnchorLine}.`
    : hiddenRiskOutput.hidden_risk_summary.manual_review_required
      ? `Final posture is ${proposedDisposition}. Hidden-risk review status is ${hiddenRiskOutput.status}, so discharge should not advance on unresolved narrative uncertainty alone. Manual clinician review is required before final disposition.`
      : `Final posture remains ${proposedDisposition}. Narrative review did not surface additional discharge-changing hidden risk. Continue the deterministic transition safeguards and clinician sign-off before final disposition.`;

  keyPoints.push(`Evidence anchors: ${evidenceAnchorLine}`);
  keyPoints.push(buildHandoffBrief(input, proposedDisposition, hiddenRiskOutput));
  keyPoints.push(buildPatientGuidanceLine(proposedDisposition, hiddenRiskOutput));
  keyPoints.push(buildTopActionSummary(recommendedActions));

  const output: TransitionNarrativeOutput = {
    contract_version: "phase0_transition_narrative_v1",
    status: hiddenRiskOutput.status,
    patient_id: input.deterministic_snapshot.patient_id ?? null,
    encounter_id: input.deterministic_snapshot.encounter_id ?? null,
    baseline_verdict: input.deterministic_snapshot.baseline_verdict,
    proposed_disposition: proposedDisposition,
    narrative,
    key_points: keyPoints,
    recommended_actions: sortActionsByPriority(recommendedActions).map((action, index) => ({
      ...action,
      action_id: `action_${String(index + 1).padStart(3, "0")}`,
    })),
    citations: hiddenRiskOutput.citations,
    manual_review_required: hiddenRiskOutput.hidden_risk_summary.manual_review_required,
    safety_boundary:
      "Assistive discharge-transition synthesis only. Final discharge authority remains with the licensed clinical team.",
  };

  return narrativeOutputSchema.parse(output);
};
