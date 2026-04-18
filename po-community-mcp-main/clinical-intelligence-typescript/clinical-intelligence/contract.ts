import { z } from "zod";

export const CANONICAL_VERDICTS = ["ready", "ready_with_caveats", "not_ready"] as const;
export const CANONICAL_BLOCKER_CATEGORIES = [
  "clinical_stability",
  "pending_diagnostics",
  "medication_reconciliation",
  "follow_up_and_referrals",
  "patient_education",
  "home_support_and_services",
  "equipment_and_transport",
  "administrative_and_documentation",
] as const;
export const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;
export const HIDDEN_RISK_RESULTS = [
  "hidden_risk_present",
  "no_hidden_risk",
  "inconclusive",
] as const;
export const DISPOSITION_IMPACTS = ["none", "caveat", "not_ready", "uncertain"] as const;
export const RECOMMENDED_ORCHESTRATOR_ACTIONS = [
  "add_blocker",
  "escalate_existing_blocker",
  "request_manual_review",
  "ignore_duplicate",
] as const;

export const deterministicBlockerSchema = z.object({
  blocker_id: z.string().min(1),
  category: z.enum(CANONICAL_BLOCKER_CATEGORIES),
  description: z.string().min(1),
  severity: z.enum(["low", "medium", "high"]).optional(),
});

export const deterministicSnapshotSchema = z.object({
  patient_id: z.string().nullable().optional(),
  encounter_id: z.string().nullable().optional(),
  baseline_verdict: z.enum(CANONICAL_VERDICTS),
  deterministic_blockers: z.array(deterministicBlockerSchema).default([]),
  deterministic_evidence: z
    .array(
      z.object({
        evidence_id: z.string().optional(),
        source_label: z.string().min(1),
        detail: z.string().optional(),
      }),
    )
    .default([]),
  deterministic_next_steps: z.array(z.string().min(1)).default([]),
  deterministic_summary: z.string().min(1),
});

export const narrativeSourceSchema = z.object({
  source_id: z.string().min(1),
  source_type: z.string().min(1),
  source_label: z.string().min(1),
  locator: z.string().optional(),
  timestamp: z.string().optional(),
  excerpt: z.string().min(1),
});

export const hiddenRiskInputSchema = z.object({
  deterministic_snapshot: deterministicSnapshotSchema,
  narrative_evidence_bundle: z.array(narrativeSourceSchema).default([]),
  optional_context_metadata: z
    .object({
      care_setting: z.string().optional(),
      discharge_destination: z.string().optional(),
      reviewer_timestamp: z.string().optional(),
      explicit_task_goal: z.string().optional(),
    })
    .optional(),
});

export const hiddenRiskOutputSchema = z.object({
  contract_version: z.literal("phase0_hidden_risk_v1"),
  status: z.enum(["ok", "inconclusive", "insufficient_context", "error"]),
  patient_id: z.string().nullable(),
  encounter_id: z.string().nullable(),
  baseline_verdict: z.enum(CANONICAL_VERDICTS),
  hidden_risk_summary: z.object({
    result: z.enum(HIDDEN_RISK_RESULTS),
    overall_disposition_impact: z.enum(DISPOSITION_IMPACTS),
    confidence: z.enum(CONFIDENCE_LEVELS),
    summary: z.string().min(1),
    manual_review_required: z.boolean(),
    false_positive_guardrail: z.string().min(1),
  }),
  hidden_risk_findings: z.array(
    z.object({
      finding_id: z.string().min(1),
      title: z.string().min(1),
      category: z.enum(CANONICAL_BLOCKER_CATEGORIES),
      disposition_impact: z.enum(DISPOSITION_IMPACTS),
      confidence: z.enum(CONFIDENCE_LEVELS),
      is_duplicate_of_blocker_id: z.string().nullable(),
      rationale: z.string().min(1),
      recommended_orchestrator_action: z.enum(RECOMMENDED_ORCHESTRATOR_ACTIONS),
      citation_ids: z.array(z.string().min(1)),
    }),
  ),
  citations: z.array(
    z.object({
      citation_id: z.string().min(1),
      source_type: z.string().min(1),
      source_label: z.string().min(1),
      locator: z.string().min(1),
      excerpt: z.string().min(1),
    }),
  ),
  review_metadata: z.object({
    narrative_sources_reviewed: z.number().int().nonnegative(),
    duplicate_findings_suppressed: z.number().int().nonnegative(),
    weak_findings_suppressed: z.number().int().nonnegative(),
  }),
});

export type HiddenRiskInput = z.infer<typeof hiddenRiskInputSchema>;
export type HiddenRiskOutput = z.infer<typeof hiddenRiskOutputSchema>;
export type HiddenRiskFinding = HiddenRiskOutput["hidden_risk_findings"][number];
export type DeterministicBlocker = z.infer<typeof deterministicBlockerSchema>;
