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
import {
  buildNormalizedEvidenceBundle,
  getEvidenceIdsForCategory,
} from "./evidence-layer";

const PRIORITY_WEIGHT: Record<BlockerPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const CATEGORY_ORDER: Record<BlockerCategory, number> = {
  clinical_stability: 1,
  pending_diagnostics: 2,
  medication_reconciliation: 3,
  follow_up_and_referrals: 4,
  patient_education: 5,
  home_support_and_services: 6,
  equipment_and_transport: 7,
  administrative_and_documentation: 8,
};

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

const OWNER_BY_CATEGORY: Record<BlockerCategory, string> = {
  clinical_stability: "Primary team",
  pending_diagnostics: "Primary team / Diagnostics",
  medication_reconciliation: "Pharmacy / Primary team",
  follow_up_and_referrals: "Case management",
  patient_education: "Nursing",
  home_support_and_services: "Case management / Social work",
  equipment_and_transport: "Care coordination",
  administrative_and_documentation: "Primary team / Case management",
};

const BLOCKER_ID_BY_CATEGORY: Record<BlockerCategory, string> = {
  clinical_stability: "blocker-clinical-stability",
  pending_diagnostics: "blocker-pending-diagnostics",
  medication_reconciliation: "blocker-medication-reconciliation",
  follow_up_and_referrals: "blocker-follow-up-and-referrals",
  patient_education: "blocker-patient-education",
  home_support_and_services: "blocker-home-support-and-services",
  equipment_and_transport: "blocker-equipment-and-transport",
  administrative_and_documentation: "blocker-administrative-and-documentation",
};

const EVIDENCE_UNCERTAINTY_PRIORITY: Record<BlockerCategory, BlockerPriority> = {
  clinical_stability: "high",
  pending_diagnostics: "high",
  medication_reconciliation: "high",
  follow_up_and_referrals: "medium",
  patient_education: "medium",
  home_support_and_services: "high",
  equipment_and_transport: "medium",
  administrative_and_documentation: "medium",
};

const EVIDENCE_UNCERTAINTY_ACTION: Record<BlockerCategory, string> = {
  clinical_stability:
    "Resolve conflicting stability evidence with repeat bedside assessment and explicit clinician documentation before discharge.",
  pending_diagnostics:
    "Resolve contradictory diagnostic status documentation and record one reconciled interpretation for discharge-critical results.",
  medication_reconciliation:
    "Resolve uncertain or conflicting medication evidence and document one finalized discharge medication plan.",
  follow_up_and_referrals:
    "Reconcile conflicting referral/follow-up documentation and publish a single closed-loop follow-up plan.",
  patient_education:
    "Resolve uncertainty in education evidence with repeat teach-back and final documented understanding.",
  home_support_and_services:
    "Resolve contradictory home-support evidence and confirm caregiver/services with named contacts and timing.",
  equipment_and_transport:
    "Resolve conflicting logistics documentation and confirm final transport/equipment timing before departure.",
  administrative_and_documentation:
    "Resolve conflicting administrative documentation and capture a finalized signed discharge packet status.",
};

const REQUIRED_INPUT_SECTIONS = [
  "clinical_stability",
  "pending_diagnostics",
  "medication_reconciliation",
  "follow_up_and_referrals",
  "patient_education",
  "home_support_and_services",
  "equipment_and_transport",
  "administrative_and_documentation",
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const assertValidReadinessInput: (input: unknown) => asserts input is ReadinessInput = (
  input: unknown,
) => {
  if (!isRecord(input)) {
    throw new Error("Missing patient context: readiness input payload is required.");
  }

  const candidate = input as Partial<ReadinessInput>;

  if (
    typeof candidate.scenario_id !== "string" ||
    candidate.scenario_id.trim().length === 0
  ) {
    throw new Error("Missing patient context: scenario_id is required.");
  }

  for (const section of REQUIRED_INPUT_SECTIONS) {
    if (!isRecord(candidate[section])) {
      throw new Error(`Malformed readiness input: missing required section '${section}'.`);
    }
  }

  if (!Array.isArray(candidate.evidence_catalog) || candidate.evidence_catalog.length === 0) {
    throw new Error(
      "Insufficient evidence: no evidence_catalog entries were provided for readiness assessment.",
    );
  }

  const contradictions = candidate.source_consistency?.contradictory_evidence ?? [];
  if (contradictions.length > 0) {
    throw new Error(
      `Contradictory evidence across sources: ${contradictions.join(" | ")}`,
    );
  }
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
  evidenceCatalog: ReadinessInput["evidence_catalog"],
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

  const evidenceById = new Map(evidenceCatalog.map((evidence) => [evidence.id, evidence]));
  const trace: EvidenceTrace[] = [];

  for (const [evidenceId, supports] of evidenceToBlockers.entries()) {
    const evidence = evidenceById.get(evidenceId) ?? {
      id: evidenceId,
      source_type: "structured" as const,
      source_label: "Evidence/normalization-gap",
      detail:
        "Evidence ID was referenced by readiness logic but not found in the normalized evidence catalog.",
    };

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

const hasEvidenceConflict = (
  category: BlockerCategory,
  normalizedEvidence: ReturnType<typeof buildNormalizedEvidenceBundle>,
): boolean => {
  return normalizedEvidence.contradictions.some(
    (contradiction) => contradiction.category === category,
  );
};

const hasEvidenceAmbiguity = (
  category: BlockerCategory,
  normalizedEvidence: ReturnType<typeof buildNormalizedEvidenceBundle>,
): boolean => {
  return normalizedEvidence.ambiguities.some((ambiguity) => ambiguity.category === category);
};

const buildEvidenceUncertaintyPhrase = (
  category: BlockerCategory,
  normalizedEvidence: ReturnType<typeof buildNormalizedEvidenceBundle>,
): string | null => {
  const conflict = hasEvidenceConflict(category, normalizedEvidence);
  const ambiguity = hasEvidenceAmbiguity(category, normalizedEvidence);

  if (!conflict && !ambiguity) {
    return null;
  }

  if (conflict && ambiguity) {
    return "Evidence conflict and evidence uncertainty remain unresolved across sources.";
  }

  if (conflict) {
    return "Evidence conflict remains unresolved across sources.";
  }

  return "Evidence uncertainty remains unresolved across sources.";
};

const assertEvidenceCoverage = (
  blockers: DischargeBlocker[],
  evidenceCatalog: ReadinessInput["evidence_catalog"],
): void => {
  const availableEvidenceIds = new Set(evidenceCatalog.map((record) => record.id));
  const missingEvidenceIds = new Set<string>();

  for (const blocker of blockers) {
    for (const evidenceId of blocker.evidence) {
      if (!availableEvidenceIds.has(evidenceId)) {
        missingEvidenceIds.add(evidenceId);
      }
    }
  }

  if (missingEvidenceIds.size > 0) {
    throw new Error(
      `Insufficient evidence: blocker-linked evidence is missing from evidence_catalog (${[...missingEvidenceIds].join(", ")}).`,
    );
  }
};

export const assessDischargeReadinessV1 = (
  input: ReadinessInput,
): AssessDischargeReadinessResponse => {
  assertValidReadinessInput(input);
  const normalizedEvidence = buildNormalizedEvidenceBundle(input);
  const evidenceForCategory = (category: BlockerCategory): string[] => {
    const evidenceIds = getEvidenceIdsForCategory(normalizedEvidence, category);
    if (evidenceIds.length > 0) {
      return evidenceIds;
    }

    return [`missing-evidence-${category}`];
  };

  const blockers: DischargeBlocker[] = [];

  const oxygenAboveBaseline =
    input.clinical_stability.oxygen_lpm > input.clinical_stability.baseline_oxygen_lpm;
  if (
    !input.clinical_stability.vitals_stable ||
    oxygenAboveBaseline
  ) {
    const reasons: string[] = [];
    if (!input.clinical_stability.vitals_stable) {
      reasons.push("Vital signs are not fully stable.");
    }
    if (oxygenAboveBaseline) {
      reasons.push(
        `Oxygen need is ${input.clinical_stability.oxygen_lpm} L/min vs baseline ${input.clinical_stability.baseline_oxygen_lpm} L/min.`,
      );
    }

    blockers.push({
      id: "blocker-clinical-stability",
      category: "clinical_stability",
      priority: "high",
      description:
        `Clinical stability is not yet cleared for home discharge. ${reasons.join(" ")}`,
      evidence: evidenceForCategory("clinical_stability"),
      actionability:
        "Reassess oxygen and overall stability, then explicitly document whether home transition criteria are met. Complete only after unresolved stability findings are reviewed by the primary team.",
    });
  }

  if (
    input.pending_diagnostics.critical_results_pending ||
    input.pending_diagnostics.pending_items.length > 0
  ) {
    blockers.push({
      id: "blocker-pending-diagnostics",
      category: "pending_diagnostics",
      priority: "high",
      description: `Discharge-critical diagnostics remain unresolved. ${formatGaps(
        input.pending_diagnostics.pending_items,
        "Pending diagnostic items require review before discharge.",
      )}`,
      evidence: evidenceForCategory("pending_diagnostics"),
      actionability:
        "Review pending diagnostics, document interpretation, and close any results that could alter discharge safety.",
    });
  }

  if (
    !input.medication_reconciliation.reconciliation_complete ||
    input.medication_reconciliation.unresolved_issues.length > 0
  ) {
    blockers.push({
      id: "blocker-medication-reconciliation",
      category: "medication_reconciliation",
      priority: "high",
      description: `Medication reconciliation remains incomplete for discharge safety. ${formatGaps(
        input.medication_reconciliation.unresolved_issues,
        "Medication discrepancies are unresolved.",
      )}`,
      evidence: evidenceForCategory("medication_reconciliation"),
      actionability:
        "Resolve medication discrepancies and publish one finalized discharge medication list. Complete when all active inpatient-only orders are reconciled and restart timing/instructions are explicit.",
    });
  }

  if (
    !input.follow_up_and_referrals.appointments_scheduled ||
    input.follow_up_and_referrals.missing_referrals.length > 0
  ) {
    blockers.push({
      id: "blocker-follow-up-and-referrals",
      category: "follow_up_and_referrals",
      priority: "medium",
      description: `Follow-up coordination is incomplete. ${formatGaps(
        input.follow_up_and_referrals.missing_referrals,
        "Required appointments or referrals are not fully confirmed.",
      )}`,
      evidence: evidenceForCategory("follow_up_and_referrals"),
      actionability:
        "Schedule required follow-up/referrals and include date, location, and contact details in the transition packet before discharge.",
    });
  }

  if (
    !input.patient_education.teach_back_complete ||
    input.patient_education.documented_gaps.length > 0
  ) {
    blockers.push({
      id: "blocker-patient-education",
      category: "patient_education",
      priority: "medium",
      description: `Discharge education remains incomplete. ${formatGaps(
        input.patient_education.documented_gaps,
        "Teach-back and escalation instructions are not yet documented as complete.",
      )}`,
      evidence: evidenceForCategory("patient_education"),
      actionability:
        "Complete teach-back for warning signs, medication use, and escalation pathways, then document patient understanding in the discharge note.",
    });
  }

  if (
    !input.home_support_and_services.caregiver_confirmed ||
    !input.home_support_and_services.services_confirmed ||
    input.home_support_and_services.documented_gaps.length > 0
  ) {
    blockers.push({
      id: "blocker-home-support-and-services",
      category: "home_support_and_services",
      priority: "high",
      description: `Home support is not fully confirmed. ${formatGaps(
        input.home_support_and_services.documented_gaps,
        "Caregiver coverage and home services remain unverified.",
      )}`,
      evidence: evidenceForCategory("home_support_and_services"),
      actionability:
        "Confirm caregiver availability and required home services with named contacts and start timing documented in the discharge plan.",
    });
  }

  if (
    !input.equipment_and_transport.transport_confirmed ||
    !input.equipment_and_transport.equipment_ready ||
    input.equipment_and_transport.documented_gaps.length > 0
  ) {
    blockers.push({
      id: "blocker-equipment-and-transport",
      category: "equipment_and_transport",
      priority:
        !input.equipment_and_transport.equipment_ready ||
          !input.equipment_and_transport.transport_confirmed
          ? "high"
          : "medium",
      description: `Discharge logistics are incomplete. ${formatGaps(
        input.equipment_and_transport.documented_gaps,
        "Transport and required equipment status are not fully confirmed.",
      )}`,
      evidence: evidenceForCategory("equipment_and_transport"),
      actionability:
        "Confirm equipment delivery and transportation timing with an explicit handoff timestamp before patient departure.",
    });
  }

  if (
    !input.administrative_and_documentation.discharge_documents_complete ||
    input.administrative_and_documentation.documented_gaps.length > 0
  ) {
    blockers.push({
      id: "blocker-administrative-and-documentation",
      category: "administrative_and_documentation",
      priority: "medium",
      description: `Administrative discharge documentation is incomplete. ${formatGaps(
        input.administrative_and_documentation.documented_gaps,
        "Required discharge forms and sign-offs are not fully completed.",
      )}`,
      evidence: evidenceForCategory("administrative_and_documentation"),
      actionability:
        "Complete required discharge documents, finalize sign-offs, and verify the transition packet is complete before patient departure.",
    });
  }

  const seenCategories = new Set(blockers.map((blocker) => blocker.category));
  const allCategories = Object.keys(CATEGORY_ORDER) as BlockerCategory[];
  for (const category of allCategories) {
    const uncertaintyPhrase = buildEvidenceUncertaintyPhrase(category, normalizedEvidence);
    if (!uncertaintyPhrase) {
      continue;
    }

    if (!seenCategories.has(category)) {
      blockers.push({
        id: BLOCKER_ID_BY_CATEGORY[category],
        category,
        priority: EVIDENCE_UNCERTAINTY_PRIORITY[category],
        description:
          `Readiness evidence remains unresolved for ${CATEGORY_LABEL[category]}. ${uncertaintyPhrase}`,
        evidence: evidenceForCategory(category),
        actionability: EVIDENCE_UNCERTAINTY_ACTION[category],
      });
      seenCategories.add(category);
      continue;
    }

    const existing = blockers.find((blocker) => blocker.category === category);
    if (existing && !existing.description.includes("Evidence conflict") &&
      !existing.description.includes("Evidence uncertainty")) {
      existing.description = `${existing.description} ${uncertaintyPhrase}`;
    }
  }

  const orderedBlockers = sortedByPriority(blockers);
  assertEvidenceCoverage(orderedBlockers, normalizedEvidence.evidence_catalog);
  const verdict = determineVerdict(orderedBlockers);
  const evidence = buildEvidenceTrace(orderedBlockers, normalizedEvidence.evidence_catalog);
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
