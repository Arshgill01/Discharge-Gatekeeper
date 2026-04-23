import { BlockerCategory, BlockerPriority } from "./contract";

export const CATEGORY_LABEL: Record<BlockerCategory, string> = {
  clinical_stability: "clinical stability",
  pending_diagnostics: "pending diagnostics",
  medication_reconciliation: "medication reconciliation",
  follow_up_and_referrals: "follow-up and referrals",
  patient_education: "patient education",
  home_support_and_services: "home support and services",
  equipment_and_transport: "equipment and transport",
  administrative_and_documentation: "administrative and documentation",
};

export const OWNER_BY_CATEGORY: Record<BlockerCategory, string> = {
  clinical_stability: "Primary team",
  pending_diagnostics: "Primary team / Diagnostics",
  medication_reconciliation: "Pharmacy / Primary team",
  follow_up_and_referrals: "Case management",
  patient_education: "Nursing",
  home_support_and_services: "Case management / Social work",
  equipment_and_transport: "Care coordination",
  administrative_and_documentation: "Primary team / Case management",
};

export const TIMING_HINT_BY_PRIORITY: Record<BlockerPriority, string> = {
  high: "Immediate discharge hold action:",
  medium: "Before final discharge order:",
  low: "Before packet finalization:",
};

export const COMPLETION_SIGNAL_BY_CATEGORY: Record<BlockerCategory, string> = {
  clinical_stability:
    "Primary team documents exertion-aware stability and explicit discharge clearance.",
  pending_diagnostics:
    "All discharge-critical diagnostics are resulted or explicitly cleared in the chart.",
  medication_reconciliation:
    "A single reconciled discharge medication list is signed and reviewed with the patient.",
  follow_up_and_referrals:
    "Follow-up/referral dates, locations, and contacts are documented in the packet.",
  patient_education:
    "Teach-back completion and escalation instructions are documented as understood.",
  home_support_and_services:
    "Overnight caregiver/home-service plan is confirmed with named contact and timing.",
  equipment_and_transport:
    "Required equipment and transport have confirmed delivery/pickup windows.",
  administrative_and_documentation:
    "Required discharge summary, AVS, and sign-offs are finalized in the packet.",
};

const HIDDEN_RISK_ACTIONABILITY_BY_CATEGORY: Record<BlockerCategory, string> = {
  clinical_stability:
    "Repeat exertional oxygen assessment and document whether home discharge remains safe today.",
  pending_diagnostics:
    "Resolve the discharge-critical diagnostic gap that the narrative review surfaced before discharge proceeds.",
  medication_reconciliation:
    "Reconcile the medication discrepancy highlighted by the hidden-risk review before discharge proceeds.",
  follow_up_and_referrals:
    "Confirm the follow-up or referral dependency surfaced by the hidden-risk review before discharge proceeds.",
  patient_education:
    "Repeat targeted teach-back for the hidden-risk concern and document patient understanding before discharge proceeds.",
  home_support_and_services:
    "Confirm overnight caregiver coverage or arrange an alternate safe first-night support plan before discharge proceeds.",
  equipment_and_transport:
    "Confirm the required equipment delivery and transport timing before any discharge order proceeds.",
  administrative_and_documentation:
    "Resolve the documentation gap surfaced by the hidden-risk review before discharge proceeds.",
};

export const getTransitionTimingHint = (priority: BlockerPriority): string => {
  return TIMING_HINT_BY_PRIORITY[priority].replace(/:$/, "");
};

export const buildTransitionActionText = (
  priority: BlockerPriority,
  category: BlockerCategory,
  actionability: string,
): string => {
  return `${TIMING_HINT_BY_PRIORITY[priority]} ${actionability} ` +
    `Completion signal: ${COMPLETION_SIGNAL_BY_CATEGORY[category]}`;
};

export const buildHiddenRiskTransitionAction = (
  category: BlockerCategory,
  priority: BlockerPriority,
): string => {
  return buildTransitionActionText(
    priority,
    category,
    HIDDEN_RISK_ACTIONABILITY_BY_CATEGORY[category],
  );
};
