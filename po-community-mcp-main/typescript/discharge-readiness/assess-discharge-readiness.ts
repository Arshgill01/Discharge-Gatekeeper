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

const CATEGORY_ORDER: Record<BlockerCategory, number> = {
  clinical: 1,
  medications: 2,
  follow_up: 3,
  education: 4,
  home_support: 5,
  logistics: 6,
};

const CATEGORY_LABEL: Record<BlockerCategory, string> = {
  clinical: "clinical stability",
  medications: "medication reconciliation",
  follow_up: "follow-up coordination",
  education: "discharge education",
  home_support: "home support",
  logistics: "discharge logistics",
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
    const priorityDelta = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    const categoryDelta = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
    if (categoryDelta !== 0) {
      return categoryDelta;
    }

    return a.id.localeCompare(b.id);
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
  const blockerOrder = new Map<string, number>();
  blockers.forEach((blocker, index) => {
    blockerOrder.set(blocker.id, index);
  });

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

    const uniqueSupports = [...new Set(supports)].sort((a, b) => {
      return (blockerOrder.get(a) ?? Number.MAX_SAFE_INTEGER) -
        (blockerOrder.get(b) ?? Number.MAX_SAFE_INTEGER);
    });

    trace.push({
      ...evidence,
      supports_blockers: uniqueSupports,
    });
  }

  return trace.sort((a, b) => {
    const firstA = a.supports_blockers[0] ?? "";
    const firstB = b.supports_blockers[0] ?? "";

    const blockerDelta = (blockerOrder.get(firstA) ?? Number.MAX_SAFE_INTEGER) -
      (blockerOrder.get(firstB) ?? Number.MAX_SAFE_INTEGER);
    if (blockerDelta !== 0) {
      return blockerDelta;
    }

    return a.id.localeCompare(b.id);
  });
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
  const highPriorityBlockers = blockers.filter((blocker) => blocker.priority === "high");
  const mediumPriorityBlockers = blockers.filter(
    (blocker) => blocker.priority === "medium",
  );
  const lowPriorityBlockers = blockers.filter((blocker) => blocker.priority === "low");

  if (verdict === "ready") {
    return "Verdict: READY. No active discharge blockers were detected in this assistive readiness review; final disposition remains with the clinical team.";
  }

  const highCount = highPriorityBlockers.length;
  const mediumCount = mediumPriorityBlockers.length;
  const lowCount = lowPriorityBlockers.length;

  if (verdict === "not_ready") {
    const topHighCategories = highPriorityBlockers
      .map((blocker) => CATEGORY_LABEL[blocker.category])
      .join(", ");
    return `Verdict: NOT READY. ${blockers.length} active blockers detected (${highCount} high, ${mediumCount} medium, ${lowCount} low). Highest-priority blockers: ${topHighCategories}. Resolve high-priority blockers and confirm readiness with clinician review before discharge.`;
  }

  const caveatCategories = mediumPriorityBlockers
    .map((blocker) => CATEGORY_LABEL[blocker.category])
    .join(", ");
  return `Verdict: READY WITH CAVEATS. ${blockers.length} blockers remain (${highCount} high, ${mediumCount} medium, ${lowCount} low), primarily in: ${caveatCategories}. Discharge should proceed only after caveats are explicitly addressed and documented by the care team.`;
};

const formatGaps = (issues: string[], fallback: string): string => {
  return issues.length > 0 ? issues.join(" ") : fallback;
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
    const reasons: string[] = [];
    if (!input.clinical.vitals_stable) {
      reasons.push("Vital signs are not fully stable.");
    }
    if (oxygenAboveBaseline) {
      reasons.push(
        `Oxygen need is ${input.clinical.oxygen_lpm} L/min vs baseline ${input.clinical.baseline_oxygen_lpm} L/min.`,
      );
    }
    if (input.clinical.pending_critical_labs) {
      reasons.push("Critical lab review is still pending.");
    }

    blockers.push({
      id: "blocker-clinical-stability",
      category: "clinical",
      priority: "high",
      description:
        `Clinical stability is not yet cleared for home discharge. ${reasons.join(" ")}`,
      evidence: ["obs-oxygen-2lpm"],
      actionability:
        "Reassess oxygen and overall stability, then explicitly document whether home transition criteria are met. Complete only after unresolved stability findings are reviewed by the primary team.",
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
      description: `Medication reconciliation remains incomplete for discharge safety. ${formatGaps(
        input.medications.unresolved_issues,
        "Medication discrepancies are unresolved.",
      )}`,
      evidence: ["note-med-rec-gap"],
      actionability:
        "Resolve medication discrepancies and publish one finalized discharge medication list. Complete when all active inpatient-only orders are reconciled and restart timing/instructions are explicit.",
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
      description: `Follow-up coordination is incomplete. ${formatGaps(
        input.follow_up.missing_referrals,
        "Required appointments or referrals are not fully confirmed.",
      )}`,
      evidence: ["note-followup-missing"],
      actionability:
        "Schedule required follow-up/referrals and include date, location, and contact details in the transition packet before discharge.",
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
      description: `Discharge education remains incomplete. ${formatGaps(
        input.education.documented_gaps,
        "Teach-back and escalation instructions are not yet documented as complete.",
      )}`,
      evidence: ["note-teachback-incomplete"],
      actionability:
        "Complete teach-back for warning signs, medication use, and escalation pathways, then document patient understanding in the discharge note.",
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
      description: `Home support is not fully confirmed. ${formatGaps(
        input.home_support.documented_gaps,
        "Caregiver coverage and home services remain unverified.",
      )}`,
      evidence: ["note-caregiver-unconfirmed"],
      actionability:
        "Confirm caregiver availability and required home services with named contacts and start timing documented in the discharge plan.",
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
      priority:
        !input.logistics.equipment_ready || !input.logistics.transport_confirmed
          ? "high"
          : "medium",
      description: `Discharge logistics are incomplete. ${formatGaps(
        input.logistics.documented_gaps,
        "Transport and required equipment status are not fully confirmed.",
      )}`,
      evidence: ["note-oxygen-delivery-pending"],
      actionability:
        "Confirm equipment delivery and transportation timing with an explicit handoff timestamp before patient departure.",
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
