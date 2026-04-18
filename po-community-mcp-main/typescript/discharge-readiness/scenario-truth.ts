import { BlockerCategory, BlockerPriority, ReadinessVerdict } from "./contract";

export type ScenarioTruth = {
  verdict: ReadinessVerdict;
  expected_blocker_count: number;
  required_categories: BlockerCategory[];
  forbidden_categories: BlockerCategory[];
  priority_counts: Partial<Record<BlockerPriority, number>>;
  summary_phrase: string;
};

export const SCENARIO_V1_TRUTH: ScenarioTruth = {
  verdict: "not_ready",
  expected_blocker_count: 6,
  required_categories: [
    "clinical_stability",
    "medication_reconciliation",
    "follow_up_and_referrals",
    "patient_education",
    "home_support_and_services",
    "equipment_and_transport",
  ],
  forbidden_categories: ["pending_diagnostics", "administrative_and_documentation"],
  priority_counts: {
    high: 4,
    medium: 2,
  },
  summary_phrase: "Verdict: NOT READY",
};

export const SCENARIO_V2_TRUTH: ScenarioTruth = {
  verdict: "ready_with_caveats",
  expected_blocker_count: 4,
  required_categories: [
    "follow_up_and_referrals",
    "patient_education",
    "equipment_and_transport",
    "administrative_and_documentation",
  ],
  forbidden_categories: [
    "clinical_stability",
    "pending_diagnostics",
    "medication_reconciliation",
    "home_support_and_services",
  ],
  priority_counts: {
    high: 0,
    medium: 4,
  },
  summary_phrase: "Verdict: READY WITH CAVEATS",
};

export const SCENARIO_V3_TRUTH: ScenarioTruth = {
  verdict: "ready",
  expected_blocker_count: 0,
  required_categories: [],
  forbidden_categories: [
    "clinical_stability",
    "pending_diagnostics",
    "medication_reconciliation",
    "follow_up_and_referrals",
    "patient_education",
    "home_support_and_services",
    "equipment_and_transport",
    "administrative_and_documentation",
  ],
  priority_counts: {
    high: 0,
    medium: 0,
    low: 0,
  },
  summary_phrase: "Verdict: READY",
};
