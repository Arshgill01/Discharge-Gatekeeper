import { CANONICAL_BLOCKER_CATEGORIES } from "./contract";

type CanonicalBlockerCategory = (typeof CANONICAL_BLOCKER_CATEGORIES)[number];

type HiddenRiskStatus = "ok" | "inconclusive" | "insufficient_context" | "error";

export type HiddenRiskExpectedMatrix = {
  scenario_id: string;
  expected_status: HiddenRiskStatus;
  should_find_hidden_risk: boolean;
  expected_disposition_impact: "none" | "caveat" | "not_ready" | "uncertain";
  expected_categories: CanonicalBlockerCategory[];
  required_citation_source_labels: string[];
  minimum_citations_per_finding: number;
  minimum_duplicate_findings_suppressed: number;
  no_risk_behavior: {
    findings_must_be_empty: boolean;
    manual_review_required: boolean;
    summary_must_contain: string;
  };
};

export type TransitionNarrativeExpectedMatrix = {
  scenario_id: string;
  expected_proposed_disposition: "ready" | "ready_with_caveats" | "not_ready";
  must_reference_baseline_verdict: boolean;
  must_include_citation_refs_when_hidden_risk_present: boolean;
  grounded_action_policy: {
    require_actions: boolean;
    require_linked_categories_for_hidden_risk: boolean;
    require_action_citations_for_hidden_risk: boolean;
  };
};

export const TRAP_HIDDEN_RISK_EXPECTED_MATRIX: HiddenRiskExpectedMatrix = {
  scenario_id: "phase0_trap_maria_alvarez",
  expected_status: "ok",
  should_find_hidden_risk: true,
  expected_disposition_impact: "not_ready",
  expected_categories: [
    "clinical_stability",
    "equipment_and_transport",
    "home_support_and_services",
  ],
  required_citation_source_labels: [
    "Nursing Note 2026-04-18 20:40",
    "Case Management Addendum 2026-04-18 20:55",
  ],
  minimum_citations_per_finding: 1,
  minimum_duplicate_findings_suppressed: 0,
  no_risk_behavior: {
    findings_must_be_empty: false,
    manual_review_required: false,
    summary_must_contain: "Narrative evidence introduces discharge-critical risk",
  },
};

export const CONTROL_HIDDEN_RISK_EXPECTED_MATRIX: HiddenRiskExpectedMatrix = {
  scenario_id: "phase0_control_no_hidden_risk",
  expected_status: "ok",
  should_find_hidden_risk: false,
  expected_disposition_impact: "none",
  expected_categories: [],
  required_citation_source_labels: [],
  minimum_citations_per_finding: 0,
  minimum_duplicate_findings_suppressed: 0,
  no_risk_behavior: {
    findings_must_be_empty: true,
    manual_review_required: false,
    summary_must_contain: "No additional",
  },
};

export const ABLATION_HIDDEN_RISK_EXPECTED_MATRIX: HiddenRiskExpectedMatrix = {
  scenario_id: "phase0_trap_maria_alvarez_ablation",
  expected_status: "ok",
  should_find_hidden_risk: false,
  expected_disposition_impact: "none",
  expected_categories: [],
  required_citation_source_labels: [],
  minimum_citations_per_finding: 0,
  minimum_duplicate_findings_suppressed: 0,
  no_risk_behavior: {
    findings_must_be_empty: true,
    manual_review_required: false,
    summary_must_contain: "No additional",
  },
};

export const DUPLICATE_SIGNAL_EXPECTED_MATRIX: HiddenRiskExpectedMatrix = {
  scenario_id: "phase0_duplicate_signal_control",
  expected_status: "ok",
  should_find_hidden_risk: false,
  expected_disposition_impact: "none",
  expected_categories: [],
  required_citation_source_labels: [],
  minimum_citations_per_finding: 0,
  minimum_duplicate_findings_suppressed: 1,
  no_risk_behavior: {
    findings_must_be_empty: true,
    manual_review_required: false,
    summary_must_contain: "No additional",
  },
};

export const INCONCLUSIVE_CONTEXT_EXPECTED_MATRIX: HiddenRiskExpectedMatrix = {
  scenario_id: "phase0_inconclusive_context",
  expected_status: "insufficient_context",
  should_find_hidden_risk: false,
  expected_disposition_impact: "uncertain",
  expected_categories: [],
  required_citation_source_labels: [],
  minimum_citations_per_finding: 0,
  minimum_duplicate_findings_suppressed: 0,
  no_risk_behavior: {
    findings_must_be_empty: true,
    manual_review_required: true,
    summary_must_contain: "missing or empty",
  },
};

export const ALTERNATIVE_HIDDEN_RISK_EXPECTED_MATRIX: HiddenRiskExpectedMatrix = {
  scenario_id: "phase0_alt_hidden_risk_home_support",
  expected_status: "ok",
  should_find_hidden_risk: true,
  expected_disposition_impact: "not_ready",
  expected_categories: ["home_support_and_services"],
  required_citation_source_labels: ["Case Management Escalation Note 2026-04-18 21:05"],
  minimum_citations_per_finding: 1,
  minimum_duplicate_findings_suppressed: 0,
  no_risk_behavior: {
    findings_must_be_empty: false,
    manual_review_required: false,
    summary_must_contain: "Structured baseline was ready",
  },
};

export const TRAP_TRANSITION_NARRATIVE_EXPECTED_MATRIX: TransitionNarrativeExpectedMatrix = {
  scenario_id: "phase0_trap_maria_alvarez",
  expected_proposed_disposition: "not_ready",
  must_reference_baseline_verdict: true,
  must_include_citation_refs_when_hidden_risk_present: true,
  grounded_action_policy: {
    require_actions: true,
    require_linked_categories_for_hidden_risk: true,
    require_action_citations_for_hidden_risk: true,
  },
};

export const CONTROL_TRANSITION_NARRATIVE_EXPECTED_MATRIX: TransitionNarrativeExpectedMatrix = {
  scenario_id: "phase0_control_no_hidden_risk",
  expected_proposed_disposition: "ready",
  must_reference_baseline_verdict: true,
  must_include_citation_refs_when_hidden_risk_present: false,
  grounded_action_policy: {
    require_actions: true,
    require_linked_categories_for_hidden_risk: false,
    require_action_citations_for_hidden_risk: false,
  },
};

export const ALTERNATIVE_TRANSITION_NARRATIVE_EXPECTED_MATRIX: TransitionNarrativeExpectedMatrix = {
  scenario_id: "phase0_alt_hidden_risk_home_support",
  expected_proposed_disposition: "not_ready",
  must_reference_baseline_verdict: true,
  must_include_citation_refs_when_hidden_risk_present: true,
  grounded_action_policy: {
    require_actions: true,
    require_linked_categories_for_hidden_risk: true,
    require_action_citations_for_hidden_risk: true,
  },
};

export const INCONCLUSIVE_TRANSITION_NARRATIVE_EXPECTED_MATRIX: TransitionNarrativeExpectedMatrix = {
  scenario_id: "phase0_inconclusive_context",
  expected_proposed_disposition: "ready_with_caveats",
  must_reference_baseline_verdict: true,
  must_include_citation_refs_when_hidden_risk_present: false,
  grounded_action_policy: {
    require_actions: true,
    require_linked_categories_for_hidden_risk: false,
    require_action_citations_for_hidden_risk: false,
  },
};
