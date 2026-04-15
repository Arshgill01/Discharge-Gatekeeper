export const V1_TOOL_NAME = "assess_discharge_readiness";
export const V1_PRIMARY_SCENARIO_ID = "first_synthetic_discharge_slice_v1";
export const V1_SCENARIO_ID = V1_PRIMARY_SCENARIO_ID;
export const V1_SCENARIO_2_ID = "second_synthetic_discharge_slice_ready_with_caveats_v1";
export const V1_SCENARIO_ID_READY_WITH_CAVEATS = V1_SCENARIO_2_ID;
export const V1_SCENARIO_ID_EVIDENCE_AMBIGUITY =
  "third_synthetic_discharge_slice_ambiguity_v1";
export const V1_SUPPORTED_SCENARIO_IDS = [
  V1_PRIMARY_SCENARIO_ID,
  V1_SCENARIO_2_ID,
] as const;

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

export type DischargeBlocker = {
  id: string;
  category: BlockerCategory;
  priority: BlockerPriority;
  description: string;
  evidence: string[];
  actionability: string;
};

export type EvidenceTrace = EvidenceRecord & {
  supports_blockers: string[];
};

export type NextStep = {
  id: string;
  priority: BlockerPriority;
  action: string;
  owner: string;
  linked_blockers: string[];
};

export type AssessDischargeReadinessResponse = {
  verdict: ReadinessVerdict;
  blockers: DischargeBlocker[];
  evidence: EvidenceTrace[];
  next_steps: NextStep[];
  summary: string;
};
