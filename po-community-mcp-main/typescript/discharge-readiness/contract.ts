export const V1_TOOL_NAME = "assess_discharge_readiness";
export const V1_SCENARIO_ID = "first_synthetic_discharge_slice_v1";

export const V1_VERDICTS = ["ready", "ready_with_caveats", "not_ready"] as const;
export type ReadinessVerdict = (typeof V1_VERDICTS)[number];

export const V1_BLOCKER_CATEGORIES = [
  "clinical",
  "medications",
  "follow_up",
  "education",
  "home_support",
  "logistics",
] as const;
export type BlockerCategory = (typeof V1_BLOCKER_CATEGORIES)[number];

export const BLOCKER_PRIORITIES = ["high", "medium", "low"] as const;
export type BlockerPriority = (typeof BLOCKER_PRIORITIES)[number];

export type EvidenceRecord = {
  id: string;
  source_type: "structured" | "note";
  source_label: string;
  detail: string;
};

export type ReadinessInput = {
  scenario_id: string;
  clinical: {
    vitals_stable: boolean;
    oxygen_lpm: number;
    baseline_oxygen_lpm: number;
    pending_critical_labs: boolean;
  };
  medications: {
    reconciliation_complete: boolean;
    unresolved_issues: string[];
  };
  follow_up: {
    appointments_scheduled: boolean;
    missing_referrals: string[];
  };
  education: {
    teach_back_complete: boolean;
    documented_gaps: string[];
  };
  home_support: {
    caregiver_confirmed: boolean;
    services_confirmed: boolean;
    documented_gaps: string[];
  };
  logistics: {
    transport_confirmed: boolean;
    equipment_ready: boolean;
    documented_gaps: string[];
  };
  evidence_catalog: EvidenceRecord[];
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
