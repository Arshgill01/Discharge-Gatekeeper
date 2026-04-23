export type CanonicalVerdict = "ready" | "ready_with_caveats" | "not_ready";

export type HiddenRiskResult = "hidden_risk_present" | "no_hidden_risk" | "inconclusive";

export type DispositionImpact = "none" | "caveat" | "not_ready" | "uncertain";

export type HiddenRiskRunStatus = "used" | "skipped" | "unavailable" | "inconclusive";

export type PromptMode = "prompt_1" | "prompt_2" | "prompt_3";

export type ParsedTaskInputSurface =
  | "root"
  | "input_envelope"
  | "task_envelope"
  | "task_input_envelope"
  | "taskInput_envelope"
  | "request_envelope"
  | "payload_envelope"
  | "raw_text";

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

export type DownstreamCallStatus = "ok" | "error" | "skipped";

export type DownstreamHttpExchange = {
  method: string;
  url: string;
  status: number;
  duration_ms: number;
  request_content_type: string | null;
  request_accept: string | null;
  response_content_type: string | null;
};

export type DownstreamCallDiagnostic = {
  call_id: string;
  component: "discharge_gatekeeper_mcp" | "clinical_intelligence_mcp";
  tool_name: string;
  mcp_url: string;
  status: DownstreamCallStatus;
  request_id: string;
  task_id: string;
  started_at: string;
  duration_ms: number;
  propagated_headers: Record<string, string>;
  http_exchanges: DownstreamHttpExchange[];
  error_message?: string;
};

export type IncomingRequestDiagnostic = {
  input_surface: ParsedTaskInputSurface;
  content_type: string | null;
  accept: string | null;
  request_headers: Record<string, string>;
};

export type TaskRuntimeDiagnostics = {
  request_id: string;
  prompt_mode: PromptMode;
  task_id: string;
  prompt_mode: PromptMode;
  task_duration_ms: number;
  hidden_risk_invoked: boolean;
  fallbacks_applied: string[];
  incoming_request: IncomingRequestDiagnostic;
  downstream_calls: DownstreamCallDiagnostic[];
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
    blocker_trust_state: string;
    trace_summary: string;
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
  last_disposition_downgrade_by:
    | "discharge_gatekeeper_mcp"
    | "clinical_intelligence_mcp"
    | "none";
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
    category: string;
    priority: string;
    timing: string;
    owner: string;
    action: string;
    rationale: string;
    linked_blockers: string[];
    linked_evidence: string[];
    citation_anchors: Array<{
      id: string;
      source: "deterministic" | "hidden_risk";
      source_label: string;
      locator?: string;
      detail: string;
    }>;
  }>;
  citations: {
    deterministic: Array<{ id: string; source_label: string; detail: string }>;
    hidden_risk: HiddenRiskResponse["citations"];
  };
  contradiction_summary: string;
  prompt_payload: {
    prompt_mode: PromptMode;
    headline: string;
    baseline_structured_verdict: CanonicalVerdict;
    final_verdict: CanonicalVerdict;
    structured_baseline_summary: string;
    reconciliation_summary: string;
    evidence_anchors: Array<{
      id: string;
      source: "deterministic" | "hidden_risk";
      source_label: string;
      locator?: string;
      detail: string;
    }>;
    impacted_blocker_categories: string[];
    action_plan: ReconciliationResult["merged_next_steps"];
    clinician_handoff_brief?: string;
    patient_discharge_guidance?: string;
  };
  hidden_risk_unavailable_reason?: string;
  runtime_diagnostics?: TaskRuntimeDiagnostics;
};

export type A2ATaskStatus = "queued" | "running" | "completed" | "failed";

export type A2ATaskErrorCode =
  | "invalid_task_input"
  | "task_timeout"
  | "deterministic_mcp_failure"
  | "clinical_intelligence_mcp_failure"
  | "orchestrator_runtime_error";

export type A2ATaskError = {
  code: A2ATaskErrorCode;
  message: string;
  retryable: boolean;
  stage: "validation" | "deterministic_call" | "hidden_risk_call" | "reconciliation";
  details?: Record<string, unknown>;
};

export type A2ATaskRecord = {
  task_id: string;
  request_id: string;
  status: A2ATaskStatus;
  created_at: string;
  completed_at: string | null;
  status_history: Array<{
    status: A2ATaskStatus;
    at: string;
  }>;
  input: A2ATaskInput;
  output: ReconciliationResult | null;
  error: A2ATaskError | null;
  diagnostics: TaskRuntimeDiagnostics | null;
};
