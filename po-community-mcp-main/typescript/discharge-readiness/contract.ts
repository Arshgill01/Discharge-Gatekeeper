export const V1_TOOL_NAME = "assess_discharge_readiness";
export const EXTRACT_BLOCKERS_TOOL_NAME = "extract_discharge_blockers";
export const GENERATE_TRANSITION_PLAN_TOOL_NAME = "generate_transition_plan";
export const V1_CLINICIAN_HANDOFF_TOOL_NAME = "build_clinician_handoff_brief";
export const V1_PATIENT_INSTRUCTIONS_TOOL_NAME = "draft_patient_discharge_instructions";
export const CORE_WORKFLOW_TOOL_NAMES = [
  V1_TOOL_NAME,
  EXTRACT_BLOCKERS_TOOL_NAME,
  GENERATE_TRANSITION_PLAN_TOOL_NAME,
] as const;
export const ARTIFACT_WORKFLOW_TOOL_NAMES = [
  V1_CLINICIAN_HANDOFF_TOOL_NAME,
  V1_PATIENT_INSTRUCTIONS_TOOL_NAME,
] as const;
export const V1_WORKFLOW_TOOL_NAMES = [
  V1_TOOL_NAME,
  EXTRACT_BLOCKERS_TOOL_NAME,
  GENERATE_TRANSITION_PLAN_TOOL_NAME,
  V1_CLINICIAN_HANDOFF_TOOL_NAME,
  V1_PATIENT_INSTRUCTIONS_TOOL_NAME,
] as const;
export const V1_PRIMARY_SCENARIO_ID = "first_synthetic_discharge_slice_v1";
export const V1_SCENARIO_ID = V1_PRIMARY_SCENARIO_ID;
export const V1_SCENARIO_2_ID = "second_synthetic_discharge_slice_ready_with_caveats_v1";
export const V1_SCENARIO_ID_READY_WITH_CAVEATS = V1_SCENARIO_2_ID;
export const V1_SCENARIO_3_ID = "third_synthetic_discharge_slice_ready_v1";
export const V1_SCENARIO_ID_READY = V1_SCENARIO_3_ID;
export const V1_SCENARIO_ID_EVIDENCE_AMBIGUITY =
  "third_synthetic_discharge_slice_ambiguity_v1";
export const V1_SUPPORTED_SCENARIO_IDS = [
  V1_PRIMARY_SCENARIO_ID,
  V1_SCENARIO_2_ID,
  V1_SCENARIO_3_ID,
] as const;
export type SupportedScenarioId = (typeof V1_SUPPORTED_SCENARIO_IDS)[number];

export const V1_VERDICTS = ["ready", "ready_with_caveats", "not_ready"] as const;
export type ReadinessVerdict = (typeof V1_VERDICTS)[number];

export const V1_BLOCKER_CATEGORIES = [
  "clinical_stability",
  "pending_diagnostics",
  "medication_reconciliation",
  "follow_up_and_referrals",
  "patient_education",
  "home_support_and_services",
  "equipment_and_transport",
  "administrative_and_documentation",
] as const;
export type BlockerCategory = (typeof V1_BLOCKER_CATEGORIES)[number];

export const BLOCKER_PRIORITIES = ["high", "medium", "low"] as const;
export type BlockerPriority = (typeof BLOCKER_PRIORITIES)[number];

export const EVIDENCE_SOURCE_TYPES = ["structured", "note", "document"] as const;
export type EvidenceSourceType = (typeof EVIDENCE_SOURCE_TYPES)[number];
export const EVIDENCE_ASSERTIONS = [
  "supports_blocker",
  "supports_readiness",
  "uncertain",
] as const;
export type EvidenceAssertion = (typeof EVIDENCE_ASSERTIONS)[number];

export type EvidenceRecord = {
  id: string;
  source_type: EvidenceSourceType;
  source_label: string;
  detail: string;
  category?: BlockerCategory;
  assertion?: EvidenceAssertion;
};

export const EVIDENCE_SIGNAL_STATES = [
  "supports_readiness",
  "blocks_readiness",
  "ambiguous",
] as const;
export type EvidenceSignalState = (typeof EVIDENCE_SIGNAL_STATES)[number];
export const BLOCKER_TRUST_STATES = [
  "supported",
  "conflicted",
  "uncertain",
  "missing_corroboration",
] as const;
export type BlockerTrustState = (typeof BLOCKER_TRUST_STATES)[number];

export type NoteDocumentSignalInput = {
  id: string;
  category: BlockerCategory;
  signal_key: string;
  state: EvidenceSignalState;
  detail: string;
  source_evidence_id?: string;
};

export type NoteDocumentInput = {
  id: string;
  source_type: "note" | "document";
  source_label: string;
  signals: NoteDocumentSignalInput[];
};

export type ReadinessInput = {
  scenario_id: string;
  clinical_stability: {
    vitals_stable: boolean;
    oxygen_lpm: number;
    baseline_oxygen_lpm: number;
  };
  pending_diagnostics: {
    critical_results_pending: boolean;
    pending_items: string[];
  };
  medication_reconciliation: {
    reconciliation_complete: boolean;
    unresolved_issues: string[];
  };
  follow_up_and_referrals: {
    appointments_scheduled: boolean;
    missing_referrals: string[];
  };
  patient_education: {
    teach_back_complete: boolean;
    documented_gaps: string[];
  };
  home_support_and_services: {
    caregiver_confirmed: boolean;
    services_confirmed: boolean;
    documented_gaps: string[];
  };
  equipment_and_transport: {
    transport_confirmed: boolean;
    equipment_ready: boolean;
    documented_gaps: string[];
  };
  administrative_and_documentation: {
    discharge_documents_complete: boolean;
    documented_gaps: string[];
  };
  evidence_catalog: EvidenceRecord[];
  note_documents?: NoteDocumentInput[];
  source_consistency?: {
    contradictory_evidence: string[];
  };
};

export type NormalizedEvidenceSignal = {
  id: string;
  category: BlockerCategory;
  signal_key: string;
  state: EvidenceSignalState;
  source_id: string;
  source_type: EvidenceSourceType;
  source_label: string;
  detail: string;
};

export type EvidenceContradiction = {
  id: string;
  category: BlockerCategory;
  signal_key: string;
  signal_ids: string[];
  source_ids: string[];
  detail: string;
};

export type EvidenceAmbiguity = {
  id: string;
  category: BlockerCategory;
  signal_key: string;
  signal_ids: string[];
  source_ids: string[];
  detail: string;
};

export type MissingEvidenceMarker = {
  id: string;
  category: BlockerCategory;
  signal_key: string;
  expected_source: EvidenceSourceType;
  detail: string;
};

export type NormalizedEvidenceBundle = {
  scenario_id: string;
  evidence_catalog: EvidenceRecord[];
  structured_signals: NormalizedEvidenceSignal[];
  note_document_signals: NormalizedEvidenceSignal[];
  contradictions: EvidenceContradiction[];
  ambiguities: EvidenceAmbiguity[];
  missing_evidence: MissingEvidenceMarker[];
};

export type BlockerProvenance = {
  trust_state: BlockerTrustState;
  source_labels: string[];
  source_types: EvidenceSourceType[];
  contradiction_ids: string[];
  ambiguity_ids: string[];
  missing_evidence_ids: string[];
  summary: string;
};

export type DischargeBlocker = {
  id: string;
  category: BlockerCategory;
  priority: BlockerPriority;
  description: string;
  evidence: string[];
  actionability: string;
  provenance: BlockerProvenance;
};

export type EvidenceTrace = EvidenceRecord & {
  supports_blockers: string[];
  supports_next_steps: string[];
  signal_states: EvidenceSignalState[];
  contradiction_ids: string[];
  ambiguity_ids: string[];
  source_summary: string;
};

export type TransitionTask = {
  id: string;
  priority: BlockerPriority;
  action: string;
  owner: string;
  linked_blockers: string[];
  linked_evidence: string[];
  blocker_trust_state: BlockerTrustState;
  trace_summary: string;
};

export type NextStep = TransitionTask;

export type AssessDischargeReadinessResponse = {
  verdict: ReadinessVerdict;
  blockers: DischargeBlocker[];
  evidence: EvidenceTrace[];
  next_steps: NextStep[];
  summary: string;
};

export type ExtractDischargeBlockersResponse = {
  verdict: ReadinessVerdict;
  blockers: DischargeBlocker[];
  evidence: EvidenceTrace[];
  summary: string;
};

export type GenerateTransitionPlanResponse = {
  verdict: ReadinessVerdict;
  blockers: DischargeBlocker[];
  evidence: EvidenceTrace[];
  next_steps: TransitionTask[];
  summary: string;
};

export type ClinicianHandoffRisk = {
  blocker_id: string;
  category: BlockerCategory;
  priority: BlockerPriority;
  unresolved_risk: string;
  evidence_ids: string[];
  trust_state: BlockerTrustState;
  source_labels: string[];
  contradiction_ids: string[];
  ambiguity_ids: string[];
  missing_evidence_ids: string[];
  trace_summary: string;
  required_action: string;
  owner: string;
  linked_next_step_id: string | null;
};

export type ClinicianHandoffBriefResponse = {
  scenario_id: string;
  readiness_verdict: ReadinessVerdict;
  review_boundary: string;
  unresolved_risks: ClinicianHandoffRisk[];
  prioritized_actions: NextStep[];
  summary: string;
};

export type PatientInstructionItem = {
  id: string;
  linked_blockers: string[];
  linked_evidence: string[];
  linked_next_step_id: string | null;
  title: string;
  instruction: string;
  reason: string;
  care_team_follow_up: string;
  care_team_verification: string;
};

export type PatientDischargeInstructionsResponse = {
  scenario_id: string;
  readiness_verdict: ReadinessVerdict;
  plain_language_notice: string;
  review_boundary: string;
  instructions: PatientInstructionItem[];
  follow_up_reminders: string[];
  emergency_guidance: string;
  summary: string;
};
