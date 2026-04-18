export type CanonicalVerdict = "ready" | "ready_with_caveats" | "not_ready";

export type HiddenRiskResult = "hidden_risk_present" | "no_hidden_risk" | "inconclusive";

export type DispositionImpact = "none" | "caveat" | "not_ready" | "uncertain";

export type HiddenRiskRunStatus = "used" | "skipped" | "unavailable" | "inconclusive";

export type NarrativeSource = {
  source_id: string;
  source_type: string;
  source_label: string;
  locator?: string;
  timestamp?: string;
  excerpt: string;
};

export type A2ATaskInput = {
  prompt: string;
  patient_context?: {
    scenario_id?: string;
    patient_id?: string | null;
    encounter_id?: string | null;
    narrative_evidence_bundle?: NarrativeSource[];
    optional_context_metadata?: {
      care_setting?: string;
      discharge_destination?: string;
      reviewer_timestamp?: string;
      explicit_task_goal?: string;
    };
  };
};

export type DeterministicResponse = {
  verdict: CanonicalVerdict;
  blockers: Array<{
    id: string;
    category: string;
    priority: string;
    description: string;
    evidence: string[];
    actionability: string;
  }>;
  evidence: Array<{
    id: string;
    source_type: string;
    source_label: string;
    detail: string;
  }>;
  next_steps: Array<{
    id: string;
    priority: string;
    action: string;
    owner: string;
    linked_blockers: string[];
    linked_evidence: string[];
  }>;
  summary: string;
};

export type HiddenRiskResponse = {
  contract_version: "phase0_hidden_risk_v1";
  status: "ok" | "inconclusive" | "insufficient_context" | "error";
  patient_id: string | null;
  encounter_id: string | null;
  baseline_verdict: CanonicalVerdict;
  hidden_risk_summary: {
    result: HiddenRiskResult;
    overall_disposition_impact: DispositionImpact;
    confidence: "low" | "medium" | "high";
    summary: string;
    manual_review_required: boolean;
    false_positive_guardrail: string;
  };
  hidden_risk_findings: Array<{
    finding_id: string;
    title: string;
    category: string;
    disposition_impact: DispositionImpact;
    confidence: "low" | "medium" | "high";
    is_duplicate_of_blocker_id: string | null;
    rationale: string;
    recommended_orchestrator_action:
      | "add_blocker"
      | "escalate_existing_blocker"
      | "request_manual_review"
      | "ignore_duplicate";
    citation_ids: string[];
  }>;
  citations: Array<{
    citation_id: string;
    source_type: string;
    source_label: string;
    locator: string;
    excerpt: string;
  }>;
  review_metadata: {
    narrative_sources_reviewed: number;
    duplicate_findings_suppressed: number;
    weak_findings_suppressed: number;
  };
};

export type ReconciliationResult = {
  final_verdict: CanonicalVerdict;
  manual_review_required: boolean;
  decision_matrix_row: number;
  decision_matrix_action: string;
  hidden_risk_run_status: HiddenRiskRunStatus;
  hidden_risk_result: HiddenRiskResult;
  hidden_risk_disposition_impact: DispositionImpact;
  deterministic: DeterministicResponse;
  hidden_risk: HiddenRiskResponse | null;
  merged_blockers: Array<{
    id: string;
    source: "deterministic" | "hidden_risk";
    category: string;
    severity: string;
    description: string;
    evidence_ids: string[];
  }>;
  merged_next_steps: Array<{
    id: string;
    source: "deterministic" | "hidden_risk";
    priority: string;
    action: string;
  }>;
  citations: {
    deterministic: Array<{ id: string; source_label: string; detail: string }>;
    hidden_risk: HiddenRiskResponse["citations"];
  };
  contradiction_summary: string;
  hidden_risk_unavailable_reason?: string;
};

export type A2ATaskStatus = "queued" | "running" | "completed" | "failed";

export type A2ATaskRecord = {
  task_id: string;
  status: A2ATaskStatus;
  created_at: string;
  completed_at: string | null;
  input: A2ATaskInput;
  output: ReconciliationResult | null;
  error: string | null;
};
