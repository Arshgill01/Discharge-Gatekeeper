import {
  AssessDischargeReadinessResponse,
  BlockerCategory,
  BlockerPriority,
  DischargeBlocker,
  EvidenceTrace,
  NextStep,
  ReadinessInput,
  ReadinessVerdict,
} from "./contract";

const PRIORITY_WEIGHT: Record<BlockerPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const OWNER_BY_CATEGORY: Record<BlockerCategory, string> = {
  clinical: "Primary team",
  medications: "Pharmacy / Primary team",
  follow_up: "Case management",
  education: "Nursing",
  home_support: "Case management / Social work",
  logistics: "Care coordination",
};

const sortedByPriority = (blockers: DischargeBlocker[]): DischargeBlocker[] => {
  return [...blockers].sort((a, b) => {
    return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
  });
};

const determineVerdict = (blockers: DischargeBlocker[]): ReadinessVerdict => {
  const hasHigh = blockers.some((blocker) => blocker.priority === "high");
  if (hasHigh) {
    return "not_ready";
  }

  const hasMedium = blockers.some((blocker) => blocker.priority === "medium");
  if (hasMedium) {
    return "ready_with_caveats";
  }

  return "ready";
};

const buildEvidenceTrace = (
  blockers: DischargeBlocker[],
  input: ReadinessInput,
): EvidenceTrace[] => {
  const evidenceToBlockers = new Map<string, string[]>();

  for (const blocker of blockers) {
    for (const evidenceId of blocker.evidence) {
      const current = evidenceToBlockers.get(evidenceId) ?? [];
      current.push(blocker.id);
      evidenceToBlockers.set(evidenceId, current);
    }
  }

  const trace: EvidenceTrace[] = [];
  for (const evidence of input.evidence_catalog) {
    const supports = evidenceToBlockers.get(evidence.id);
    if (!supports?.length) {
      continue;
    }

    trace.push({
      ...evidence,
      supports_blockers: supports,
    });
  }

  return trace;
};

const buildNextSteps = (blockers: DischargeBlocker[]): NextStep[] => {
  return sortedByPriority(blockers).map((blocker, index) => ({
    id: `step-${index + 1}`,
    priority: blocker.priority,
    action: blocker.actionability,
    owner: OWNER_BY_CATEGORY[blocker.category],
    linked_blockers: [blocker.id],
  }));
};

const buildSummary = (
  verdict: ReadinessVerdict,
  blockers: DischargeBlocker[],
): string => {
  if (verdict === "ready") {
    return "No active discharge blockers were detected in this assistive readiness check.";
  }

  const highCount = blockers.filter((blocker) => blocker.priority === "high").length;
  const mediumCount = blockers.filter(
    (blocker) => blocker.priority === "medium",
  ).length;

  if (verdict === "not_ready") {
    return `Assistive readiness check found ${blockers.length} blockers (${highCount} high priority, ${mediumCount} medium priority); discharge should be deferred until high-priority blockers are resolved and reviewed by the clinical team.`;
  }

  return `Assistive readiness check found ${blockers.length} medium-priority blockers; discharge may proceed only with explicit caveat management and clinician confirmation.`;
};

export const assessDischargeReadinessV1 = (
  input: ReadinessInput,
): AssessDischargeReadinessResponse => {
  const blockers: DischargeBlocker[] = [];

  const oxygenAboveBaseline =
    input.clinical.oxygen_lpm > input.clinical.baseline_oxygen_lpm;
  if (
    !input.clinical.vitals_stable ||
    oxygenAboveBaseline ||
    input.clinical.pending_critical_labs
  ) {
    blockers.push({
      id: "blocker-clinical-stability",
      category: "clinical",
      priority: "high",
      description:
        "Clinical stability is incomplete for home transition due to unresolved oxygen/lab stability criteria.",
      evidence: ["obs-oxygen-2lpm"],
      actionability:
        "Reassess oxygen requirement against baseline and confirm no unresolved critical labs before final discharge decision.",
    });
  }

  if (
    !input.medications.reconciliation_complete ||
    input.medications.unresolved_issues.length > 0
  ) {
    blockers.push({
      id: "blocker-medication-reconciliation",
      category: "medications",
      priority: "high",
      description: `Medication reconciliation has unresolved issues: ${input.medications.unresolved_issues.join("; ")}`,
      evidence: ["note-med-rec-gap"],
      actionability:
        "Complete medication reconciliation and publish a finalized, internally consistent discharge medication list.",
    });
  }

  if (
    !input.follow_up.appointments_scheduled ||
    input.follow_up.missing_referrals.length > 0
  ) {
    blockers.push({
      id: "blocker-follow-up",
      category: "follow_up",
      priority: "medium",
      description: `Follow-up coordination is incomplete: ${input.follow_up.missing_referrals.join("; ")}`,
      evidence: ["note-followup-missing"],
      actionability:
        "Schedule required specialty follow-up and include appointment details in the transition packet.",
    });
  }

  if (
    !input.education.teach_back_complete ||
    input.education.documented_gaps.length > 0
  ) {
    blockers.push({
      id: "blocker-education",
      category: "education",
      priority: "medium",
      description: `Discharge education is incomplete: ${input.education.documented_gaps.join("; ")}`,
      evidence: ["note-teachback-incomplete"],
      actionability:
        "Complete teach-back on warning signs, medications, and escalation pathways before discharge.",
    });
  }

  if (
    !input.home_support.caregiver_confirmed ||
    !input.home_support.services_confirmed ||
    input.home_support.documented_gaps.length > 0
  ) {
    blockers.push({
      id: "blocker-home-support",
      category: "home_support",
      priority: "high",
      description: `Home support is not fully confirmed: ${input.home_support.documented_gaps.join("; ")}`,
      evidence: ["note-caregiver-unconfirmed"],
      actionability:
        "Confirm caregiver availability and required home services, then document responsible contacts in the discharge plan.",
    });
  }

  if (
    !input.logistics.transport_confirmed ||
    !input.logistics.equipment_ready ||
    input.logistics.documented_gaps.length > 0
  ) {
    blockers.push({
      id: "blocker-logistics",
      category: "logistics",
      priority: input.logistics.equipment_ready ? "medium" : "high",
      description: `Discharge logistics are incomplete: ${input.logistics.documented_gaps.join("; ")}`,
      evidence: ["note-oxygen-delivery-pending"],
      actionability:
        "Confirm home equipment delivery and transportation timing before patient departure.",
    });
  }

  const orderedBlockers = sortedByPriority(blockers);
  const verdict = determineVerdict(orderedBlockers);
  const evidence = buildEvidenceTrace(orderedBlockers, input);
  const nextSteps = buildNextSteps(orderedBlockers);
  const summary = buildSummary(verdict, orderedBlockers);

  return {
    verdict,
    blockers: orderedBlockers,
    evidence,
    next_steps: nextSteps,
    summary,
  };
};
