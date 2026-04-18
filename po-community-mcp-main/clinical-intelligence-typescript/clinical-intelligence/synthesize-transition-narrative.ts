import { z } from "zod";
import {
  CANONICAL_BLOCKER_CATEGORIES,
  CANONICAL_VERDICTS,
  HiddenRiskInput,
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

const actionTemplateByCategory: Record<
  (typeof CANONICAL_BLOCKER_CATEGORIES)[number],
  { action: string; priority: "high" | "medium" | "low" }
> = {
  clinical_stability: {
    priority: "high",
    action: "Hold discharge and repeat exertional respiratory stability assessment before disposition.",
  },
  pending_diagnostics: {
    priority: "high",
    action: "Complete or explicitly clear pending diagnostic items before discharge.",
  },
  medication_reconciliation: {
    priority: "medium",
    action: "Resolve medication reconciliation gaps and document final discharge list.",
  },
  follow_up_and_referrals: {
    priority: "medium",
    action: "Confirm required follow-up and referral appointments before discharge release.",
  },
  patient_education: {
    priority: "medium",
    action: "Reinforce discharge education with teach-back and document comprehension gaps.",
  },
  home_support_and_services: {
    priority: "high",
    action: "Confirm overnight support and safe home supervision plan before discharge.",
  },
  equipment_and_transport: {
    priority: "high",
    action: "Confirm required home equipment and transport logistics are active before discharge.",
  },
  administrative_and_documentation: {
    priority: "low",
    action: "Complete required discharge documentation and handoff artifacts.",
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
  if (hiddenRiskResult === "inconclusive") {
    return baselineVerdict === "ready" ? "ready_with_caveats" : baselineVerdict;
  }
  return baselineVerdict;
};

const joinCitationRefs = (citationIds: string[]): string => {
  if (citationIds.length === 0) {
    return "no note citation";
  }
  return citationIds.join(", ");
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

  const keyPoints: string[] = [];
  keyPoints.push(`Baseline deterministic verdict: ${input.deterministic_snapshot.baseline_verdict}.`);
  keyPoints.push(
    `Hidden-risk review status: ${hiddenRiskOutput.status}; result: ${hiddenRiskOutput.hidden_risk_summary.result}.`,
  );

  for (const finding of hiddenRiskOutput.hidden_risk_findings) {
    keyPoints.push(
      `${finding.category}: ${finding.title} (${joinCitationRefs(finding.citation_ids)}).`,
    );
  }

  if (hiddenRiskOutput.hidden_risk_findings.length === 0) {
    keyPoints.push("No additional discharge-changing hidden risk was surfaced from notes.");
  }

  const recommendedActions: TransitionNarrativeOutput["recommended_actions"] = [];
  for (const finding of hiddenRiskOutput.hidden_risk_findings) {
    const template = actionTemplateByCategory[finding.category];
    recommendedActions.push({
      action_id: `action_${String(recommendedActions.length + 1).padStart(3, "0")}`,
      priority: template.priority,
      action: template.action,
      linked_categories: [finding.category],
      citation_ids: finding.citation_ids,
    });
  }

  if (recommendedActions.length === 0) {
    for (const [index, nextStep] of input.deterministic_snapshot.deterministic_next_steps.entries()) {
      recommendedActions.push({
        action_id: `action_${String(index + 1).padStart(3, "0")}`,
        priority: "medium",
        action: nextStep,
        linked_categories: [],
        citation_ids: [],
      });
    }
  }

  const primaryFinding = hiddenRiskOutput.hidden_risk_findings[0];
  const narrative = primaryFinding
    ? `Deterministic discharge posture was ${input.deterministic_snapshot.baseline_verdict}, but note evidence introduced a discharge-critical contradiction: ${primaryFinding.rationale} (citations: ${joinCitationRefs(primaryFinding.citation_ids)}). Pending clinician reassessment, the transition posture should be treated as ${proposedDisposition}.`
    : `Deterministic discharge posture is ${input.deterministic_snapshot.baseline_verdict}. Narrative review did not surface additional discharge-changing hidden risk. Continue with deterministic transition safeguards and clinician sign-off before final disposition.`;

  const output: TransitionNarrativeOutput = {
    contract_version: "phase0_transition_narrative_v1",
    status: hiddenRiskOutput.status,
    patient_id: input.deterministic_snapshot.patient_id ?? null,
    encounter_id: input.deterministic_snapshot.encounter_id ?? null,
    baseline_verdict: input.deterministic_snapshot.baseline_verdict,
    proposed_disposition: proposedDisposition,
    narrative,
    key_points: keyPoints,
    recommended_actions: recommendedActions,
    citations: hiddenRiskOutput.citations,
    manual_review_required: hiddenRiskOutput.hidden_risk_summary.manual_review_required,
    safety_boundary:
      "Assistive discharge-transition synthesis only. Final discharge authority remains with the licensed clinical team.",
  };

  return narrativeOutputSchema.parse(output);
};
