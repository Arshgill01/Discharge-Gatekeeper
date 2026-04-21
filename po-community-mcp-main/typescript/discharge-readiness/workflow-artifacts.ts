import {
  BlockerCategory,
  BlockerPriority,
  ClinicianHandoffBriefResponse,
  ClinicianHandoffRisk,
  NextStep,
  PatientDischargeInstructionsResponse,
  PatientInstructionItem,
  ReadinessInput,
  ReadinessVerdict,
} from "./contract";
import { assessDischargeReadinessV1 } from "./assess-discharge-readiness";

const CLINICIAN_REVIEW_BOUNDARY =
  "Assistive handoff output for clinician review and sign-off. This does not replace clinician judgment or discharge authority.";
const PATIENT_REVIEW_BOUNDARY =
  "Draft instructions generated to support care-team workflow. A licensed clinician must review and finalize before patient use.";

const CATEGORY_LABEL: Record<BlockerCategory, string> = {
  clinical_stability: "clinical stability",
  pending_diagnostics: "pending diagnostics",
  medication_reconciliation: "medication reconciliation",
  follow_up_and_referrals: "follow-up and referrals",
  patient_education: "patient education",
  home_support_and_services: "home support and services",
  equipment_and_transport: "equipment and transport",
  administrative_and_documentation: "administrative and documentation",
};

const PATIENT_TITLE_BY_CATEGORY: Record<BlockerCategory, string> = {
  clinical_stability: "Urgent breathing and stability check",
  pending_diagnostics: "Urgent pending test result check",
  medication_reconciliation: "Medication plan confirmation",
  follow_up_and_referrals: "Follow-up appointment confirmation",
  patient_education: "Teach-back and warning-sign review",
  home_support_and_services: "Home support confirmation",
  equipment_and_transport: "Equipment and ride confirmation",
  administrative_and_documentation: "Discharge paperwork completion",
};

const PATIENT_INSTRUCTION_BY_CATEGORY: Record<BlockerCategory, string> = {
  clinical_stability:
    "wait for your care team to confirm your breathing is stable both at rest and during activity.",
  pending_diagnostics:
    "wait until your care team reviews all pending test results that could change your plan.",
  medication_reconciliation:
    "review your final medication list with your nurse or pharmacist so you know what changed and when to take each medicine.",
  follow_up_and_referrals:
    "make sure your follow-up visits and referrals are booked with dates, locations, and phone numbers before you leave.",
  patient_education:
    "review warning signs with your nurse and explain back when to call for help during the day and at night.",
  home_support_and_services:
    "confirm who will help you at home tonight and which home services are arranged.",
  equipment_and_transport:
    "confirm your equipment delivery and ride pickup timing before departure.",
  administrative_and_documentation:
    "wait for your care team to complete and review your discharge paperwork and final instructions with you.",
};

const countPriorities = (
  blockers: Array<{ priority: BlockerPriority }>,
): Record<BlockerPriority, number> => {
  return blockers.reduce<Record<BlockerPriority, number>>(
    (counts, blocker) => {
      counts[blocker.priority] += 1;
      return counts;
    },
    { high: 0, medium: 0, low: 0 },
  );
};

const summarizeRiskDomains = (blockers: ClinicianHandoffRisk[], maxCount: number): string => {
  const ordered = [...new Set(blockers.map((blocker) => blocker.category))]
    .slice(0, maxCount)
    .map((category) => CATEGORY_LABEL[category]);
  return ordered.length > 0 ? ordered.join(", ") : "none";
};

const buildClinicianSummary = (
  verdict: ReadinessVerdict,
  blockers: ClinicianHandoffRisk[],
): string => {
  if (blockers.length === 0) {
    return "No unresolved discharge blockers were found in this assistive review. Final discharge disposition still requires clinician review and sign-off.";
  }

  const counts = countPriorities(blockers);
  const unresolvedCount = blockers.length;
  const topDomains = summarizeRiskDomains(blockers, 4);
  const firstOwner = blockers[0]?.owner ?? "Care team";
  return `Assistive clinician handoff for verdict '${verdict}': ${unresolvedCount} unresolved blockers remain (${counts.high} high, ${counts.medium} medium, ${counts.low} low) across ${topDomains}. First coordinated owner: ${firstOwner}. Final discharge disposition requires clinician review and sign-off.`;
};

const buildPatientSummary = (
  verdict: ReadinessVerdict,
  instructionCount: number,
): string => {
  if (verdict === "not_ready") {
    return `Discharge is not ready yet. ${instructionCount} care-plan items still need completion before you leave, and your clinician will confirm when it is safe to go home.`;
  }

  if (verdict === "ready_with_caveats") {
    return `Discharge may proceed after ${instructionCount} remaining care-plan items are reviewed and completed with your care team.`;
  }

  return "No active discharge blockers were identified in this assistive review. Wait for your care team to confirm final discharge instructions.";
};

const buildFollowUpReminders = (
  categories: Set<BlockerCategory>,
): string[] => {
  const reminders: string[] = [
    "Ask your care team to review this plan with you before leaving the hospital.",
  ];

  if (categories.has("medication_reconciliation")) {
    reminders.push("Before leaving, repeat your medication plan back to your nurse or pharmacist.");
  }
  if (categories.has("follow_up_and_referrals")) {
    reminders.push("Confirm appointment dates, locations, and phone numbers for all follow-up visits.");
  }
  if (categories.has("patient_education")) {
    reminders.push("Review warning signs and ask who to call during the day and at night.");
  }
  if (categories.has("equipment_and_transport")) {
    reminders.push("Confirm your ride and equipment delivery timing before discharge.");
  }
  if (categories.has("home_support_and_services")) {
    reminders.push("Confirm who will stay with you tonight and how to reach them after discharge.");
  }
  if (categories.has("clinical_stability")) {
    reminders.push("Ask your nurse what symptoms mean you should call for urgent help right away.");
  }

  return reminders;
};

export const buildClinicianHandoffBriefV1 = (
  input: ReadinessInput,
): ClinicianHandoffBriefResponse => {
  const readinessResponse = assessDischargeReadinessV1(input);
  const nextStepByBlockerId = new Map<string, NextStep>();

  for (const step of readinessResponse.next_steps) {
    const blockerId = step.linked_blockers[0];
    if (blockerId) {
      nextStepByBlockerId.set(blockerId, step);
    }
  }

  const unresolvedRisks: ClinicianHandoffRisk[] = readinessResponse.blockers.map((blocker) => {
    const step = nextStepByBlockerId.get(blocker.id);
    return {
      blocker_id: blocker.id,
      category: blocker.category,
      priority: blocker.priority,
      unresolved_risk: blocker.description,
      evidence_ids: blocker.evidence,
      trust_state: blocker.provenance.trust_state,
      source_labels: blocker.provenance.source_labels,
      contradiction_ids: blocker.provenance.contradiction_ids,
      ambiguity_ids: blocker.provenance.ambiguity_ids,
      missing_evidence_ids: blocker.provenance.missing_evidence_ids,
      trace_summary: blocker.provenance.summary,
      required_action: step?.action ?? blocker.actionability,
      owner: step?.owner ?? "Care team",
      linked_next_step_id: step?.id ?? null,
    };
  });

  return {
    scenario_id: input.scenario_id,
    readiness_verdict: readinessResponse.verdict,
    review_boundary: CLINICIAN_REVIEW_BOUNDARY,
    unresolved_risks: unresolvedRisks,
    prioritized_actions: readinessResponse.next_steps,
    summary: buildClinicianSummary(readinessResponse.verdict, unresolvedRisks),
  };
};

export const draftPatientDischargeInstructionsV1 = (
  input: ReadinessInput,
): PatientDischargeInstructionsResponse => {
  const readinessResponse = assessDischargeReadinessV1(input);
  const nextStepByBlockerId = new Map<string, NextStep>();

  for (const step of readinessResponse.next_steps) {
    const blockerId = step.linked_blockers[0];
    if (blockerId) {
      nextStepByBlockerId.set(blockerId, step);
    }
  }

  const instructions: PatientInstructionItem[] = readinessResponse.blockers.map((blocker, index) => {
    const linkedStep = nextStepByBlockerId.get(blocker.id);
    return {
      id: `instruction-${index + 1}`,
      linked_blockers: [blocker.id],
      linked_evidence: blocker.evidence,
      linked_next_step_id: linkedStep?.id ?? null,
      title: PATIENT_TITLE_BY_CATEGORY[blocker.category],
      instruction: `Before you leave, ${PATIENT_INSTRUCTION_BY_CATEGORY[blocker.category]}`,
      reason: blocker.description,
      care_team_follow_up: linkedStep?.action ?? blocker.actionability,
      care_team_verification: blocker.provenance.summary,
    };
  });

  const categories = new Set(readinessResponse.blockers.map((blocker) => blocker.category));

  return {
    scenario_id: input.scenario_id,
    readiness_verdict: readinessResponse.verdict,
    plain_language_notice:
      "This is a draft in plain language to help your discharge conversation with your care team.",
    review_boundary: PATIENT_REVIEW_BOUNDARY,
    instructions,
    follow_up_reminders: buildFollowUpReminders(categories),
    emergency_guidance:
      "If you have severe trouble breathing, chest pain, or sudden confusion, call emergency services right away.",
    summary: buildPatientSummary(readinessResponse.verdict, instructions.length),
  };
};
