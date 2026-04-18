import {
  AssessDischargeReadinessResponse,
  BlockerCategory,
  BlockerProvenance,
  BlockerPriority,
  BlockerTrustState,
  DischargeBlocker,
  EvidenceTrace,
  EvidenceSignalState,
  EvidenceSourceType,
  ExtractDischargeBlockersResponse,
  GenerateTransitionPlanResponse,
  NormalizedEvidenceBundle,
  ReadinessInput,
  ReadinessVerdict,
  TransitionTask,
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

const EVIDENCE_SIGNAL_PRIORITY: Record<EvidenceSourceType, number> = {
  note: 1,
  document: 2,
  structured: 3,
};

const EVIDENCE_SIGNAL_STATE_PRIORITY: Record<EvidenceSignalState, number> = {
  blocks_readiness: 1,
  ambiguous: 2,
  supports_readiness: 3,
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

type WorkflowCoreResult = {
  verdict: ReadinessVerdict;
  blockers: DischargeBlocker[];
  evidence: EvidenceTrace[];
  next_steps: TransitionTask[];
  summary: string;
  normalized_evidence: NormalizedEvidenceBundle;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

export const assertValidReadinessInput: (input: unknown) => asserts input is ReadinessInput = (
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
  normalizedEvidence: NormalizedEvidenceBundle,
  nextSteps: TransitionTask[],
): EvidenceTrace[] => {
  const evidenceToBlockers = new Map<string, string[]>();
  const blockerOrder = new Map<string, number>();
  blockers.forEach((blocker, index) => {
    blockerOrder.set(blocker.id, index);
  });
  const nextStepByBlockerId = new Map(
    nextSteps.map((step) => [step.linked_blockers[0], step]),
  );

  for (const blocker of blockers) {
    for (const evidenceId of blocker.evidence) {
      const current = evidenceToBlockers.get(evidenceId) ?? [];
      current.push(blocker.id);
      evidenceToBlockers.set(evidenceId, current);
    }
  }

  const evidenceById = new Map(evidenceCatalog.map((evidence) => [evidence.id, evidence]));
  const signalStatesByEvidenceId = new Map<string, EvidenceSignalState[]>();
  for (const signal of [
    ...normalizedEvidence.structured_signals,
    ...normalizedEvidence.note_document_signals,
  ]) {
    const current = signalStatesByEvidenceId.get(signal.source_id) ?? [];
    current.push(signal.state);
    signalStatesByEvidenceId.set(signal.source_id, current);
  }
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
    const supportsNextSteps = uniqueSupports
      .map((blockerId) => nextStepByBlockerId.get(blockerId)?.id)
      .filter((stepId): stepId is string => typeof stepId === "string");
    const signalStates = [...new Set(signalStatesByEvidenceId.get(evidenceId) ?? [])].sort((a, b) => {
      return EVIDENCE_SIGNAL_STATE_PRIORITY[a] - EVIDENCE_SIGNAL_STATE_PRIORITY[b];
    });
    const contradictionIds = normalizedEvidence.contradictions
      .filter((marker) => marker.source_ids.includes(evidenceId))
      .map((marker) => marker.id)
      .sort();
    const ambiguityIds = normalizedEvidence.ambiguities
      .filter((marker) => marker.source_ids.includes(evidenceId))
      .map((marker) => marker.id)
      .sort();
    const sourceSummarySuffix = contradictionIds.length > 0
      ? " Participates in conflicting source evidence."
      : ambiguityIds.length > 0
      ? " Participates in ambiguous source evidence."
      : "";

    trace.push({
      ...evidence,
      supports_blockers: uniqueSupports,
      supports_next_steps: supportsNextSteps,
      signal_states: signalStates,
      contradiction_ids: contradictionIds,
      ambiguity_ids: ambiguityIds,
      source_summary: `${evidence.source_type} evidence from ${evidence.source_label}.${sourceSummarySuffix}`,
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

const buildTransitionTasks = (blockers: DischargeBlocker[]): TransitionTask[] => {
  return sortedByPriority(blockers).map((blocker, index) => ({
    id: `step-${index + 1}`,
    priority: blocker.priority,
    action: blocker.actionability,
    owner: OWNER_BY_CATEGORY[blocker.category],
    linked_blockers: [blocker.id],
    linked_evidence: blocker.evidence,
    blocker_trust_state: blocker.provenance.trust_state,
    trace_summary: blocker.provenance.summary,
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

const getSignalsForCategory = (
  normalizedEvidence: NormalizedEvidenceBundle,
  category: BlockerCategory,
) => {
  return [...normalizedEvidence.note_document_signals, ...normalizedEvidence.structured_signals]
    .filter((signal) => signal.category === category)
    .sort((a, b) => {
      const stateDelta =
        EVIDENCE_SIGNAL_STATE_PRIORITY[a.state] - EVIDENCE_SIGNAL_STATE_PRIORITY[b.state];
      if (stateDelta !== 0) {
        return stateDelta;
      }

      const sourceDelta =
        EVIDENCE_SIGNAL_PRIORITY[a.source_type] - EVIDENCE_SIGNAL_PRIORITY[b.source_type];
      if (sourceDelta !== 0) {
        return sourceDelta;
      }

      return a.id.localeCompare(b.id);
    });
};

const hasEvidenceConflict = (
  category: BlockerCategory,
  normalizedEvidence: NormalizedEvidenceBundle,
): boolean => {
  return normalizedEvidence.contradictions.some(
    (contradiction) => contradiction.category === category,
  );
};

const hasEvidenceAmbiguity = (
  category: BlockerCategory,
  normalizedEvidence: NormalizedEvidenceBundle,
): boolean => {
  return normalizedEvidence.ambiguities.some((ambiguity) => ambiguity.category === category);
};

const hasNonStructuredBlockingEvidence = (
  category: BlockerCategory,
  normalizedEvidence: NormalizedEvidenceBundle,
): boolean => {
  return normalizedEvidence.note_document_signals.some((signal) => {
    return signal.category === category && signal.state === "blocks_readiness";
  });
};

const buildExternalEvidenceDetail = (
  category: BlockerCategory,
  normalizedEvidence: NormalizedEvidenceBundle,
  fallback: string,
): string => {
  const supportingSignal = normalizedEvidence.note_document_signals.find((signal) => {
    return signal.category === category &&
      (signal.state === "blocks_readiness" || signal.state === "ambiguous");
  });

  return supportingSignal?.detail ?? fallback;
};

const hasMissingCorroboration = (
  category: BlockerCategory,
  normalizedEvidence: NormalizedEvidenceBundle,
): boolean => {
  return normalizedEvidence.missing_evidence.some((marker) => marker.category === category);
};

const buildEvidenceConflictOrUncertaintyPhrase = (
  category: BlockerCategory,
  normalizedEvidence: NormalizedEvidenceBundle,
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

const determineBlockerTrustState = (
  category: BlockerCategory,
  normalizedEvidence: NormalizedEvidenceBundle,
): BlockerTrustState => {
  if (hasEvidenceConflict(category, normalizedEvidence)) {
    return "conflicted";
  }

  if (hasEvidenceAmbiguity(category, normalizedEvidence)) {
    return "uncertain";
  }

  if (hasMissingCorroboration(category, normalizedEvidence)) {
    return "missing_corroboration";
  }

  return "supported";
};

const selectEvidenceIdsForCategory = (
  normalizedEvidence: NormalizedEvidenceBundle,
  category: BlockerCategory,
): string[] => {
  const trustState = determineBlockerTrustState(category, normalizedEvidence);
  const signals = getSignalsForCategory(normalizedEvidence, category).filter((signal) => {
    if (signal.state === "blocks_readiness" || signal.state === "ambiguous") {
      return true;
    }

    return trustState === "conflicted" && signal.state === "supports_readiness";
  });

  return [...new Set(signals.map((signal) => signal.source_id))].slice(0, 3);
};

const buildBlockerProvenanceSummary = (
  trustState: BlockerTrustState,
  sourceTypes: EvidenceSourceType[],
  missingCount: number,
): string => {
  const sourcePhrase = sourceTypes.length > 0 ? sourceTypes.join(" + ") : "available";

  if (trustState === "conflicted") {
    return `Conflicting ${sourcePhrase} evidence requires clinician reconciliation before discharge.`;
  }

  if (trustState === "uncertain") {
    return `Evidence remains ambiguous across ${sourcePhrase} sources and requires clinician confirmation before discharge.`;
  }

  if (trustState === "missing_corroboration") {
    return `Current blocker is supported, but ${missingCount} expected corroborating evidence source${missingCount === 1 ? "" : "s"} remain missing.`;
  }

  return `Grounded in ${sourcePhrase} evidence without detected contradiction.`;
};

const buildBlockerProvenance = (
  category: BlockerCategory,
  normalizedEvidence: NormalizedEvidenceBundle,
): BlockerProvenance => {
  const signals = getSignalsForCategory(normalizedEvidence, category);
  const contradiction_ids = normalizedEvidence.contradictions
    .filter((marker) => marker.category === category)
    .map((marker) => marker.id)
    .sort();
  const ambiguity_ids = normalizedEvidence.ambiguities
    .filter((marker) => marker.category === category)
    .map((marker) => marker.id)
    .sort();
  const missing_evidence_ids = normalizedEvidence.missing_evidence
    .filter((marker) => marker.category === category)
    .map((marker) => marker.id)
    .sort();
  const source_labels = [...new Set(signals.map((signal) => signal.source_label))].sort();
  const source_types = [...new Set(signals.map((signal) => signal.source_type))].sort(
    (a, b) => EVIDENCE_SIGNAL_PRIORITY[a] - EVIDENCE_SIGNAL_PRIORITY[b],
  );
  const trust_state = determineBlockerTrustState(category, normalizedEvidence);

  return {
    trust_state,
    source_labels,
    source_types,
    contradiction_ids,
    ambiguity_ids,
    missing_evidence_ids,
    summary: buildBlockerProvenanceSummary(
      trust_state,
      source_types,
      missing_evidence_ids.length,
    ),
  };
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

const buildCoreBlockers = (
  input: ReadinessInput,
  normalizedEvidence: NormalizedEvidenceBundle,
): DischargeBlocker[] => {
  const evidenceForCategory = (category: BlockerCategory): string[] => {
    const evidenceIds = selectEvidenceIdsForCategory(normalizedEvidence, category);
    if (evidenceIds.length > 0) {
      return evidenceIds;
    }

    return getEvidenceIdsForCategory(normalizedEvidence, category);
  };

  const withProvenance = (
    blocker: Omit<DischargeBlocker, "provenance">,
  ): DischargeBlocker => {
    return {
      ...blocker,
      provenance: buildBlockerProvenance(blocker.category, normalizedEvidence),
    };
  };

  const blockers: DischargeBlocker[] = [];

  const oxygenAboveBaseline =
    input.clinical_stability.oxygen_lpm > input.clinical_stability.baseline_oxygen_lpm;
  if (
    !input.clinical_stability.vitals_stable ||
    oxygenAboveBaseline ||
    hasNonStructuredBlockingEvidence("clinical_stability", normalizedEvidence)
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
    if (reasons.length === 0) {
      reasons.push(
        buildExternalEvidenceDetail(
          "clinical_stability",
          normalizedEvidence,
          "Narrative evidence indicates clinical stability remains unresolved.",
        ),
      );
    }

    blockers.push(withProvenance({
      id: "blocker-clinical-stability",
      category: "clinical_stability",
      priority: "high",
      description:
        `Clinical stability is not yet cleared for home discharge. ${reasons.join(" ")}`,
      evidence: evidenceForCategory("clinical_stability"),
      actionability:
        "Reassess oxygen and overall stability, then explicitly document whether home transition criteria are met. Complete only after unresolved stability findings are reviewed by the primary team.",
    }));
  }

  if (
    input.pending_diagnostics.critical_results_pending ||
    input.pending_diagnostics.pending_items.length > 0 ||
    hasNonStructuredBlockingEvidence("pending_diagnostics", normalizedEvidence)
  ) {
    blockers.push(withProvenance({
      id: "blocker-pending-diagnostics",
      category: "pending_diagnostics",
      priority: "high",
      description: `Discharge-critical diagnostics remain unresolved. ${formatGaps(
        input.pending_diagnostics.pending_items,
        buildExternalEvidenceDetail(
          "pending_diagnostics",
          normalizedEvidence,
          "Pending diagnostic items require review before discharge.",
        ),
      )}`,
      evidence: evidenceForCategory("pending_diagnostics"),
      actionability:
        "Review pending diagnostics, document interpretation, and close any results that could alter discharge safety.",
    }));
  }

  if (
    !input.medication_reconciliation.reconciliation_complete ||
    input.medication_reconciliation.unresolved_issues.length > 0 ||
    hasNonStructuredBlockingEvidence("medication_reconciliation", normalizedEvidence)
  ) {
    blockers.push(withProvenance({
      id: "blocker-medication-reconciliation",
      category: "medication_reconciliation",
      priority: "high",
      description: `Medication reconciliation remains incomplete for discharge safety. ${formatGaps(
        input.medication_reconciliation.unresolved_issues,
        buildExternalEvidenceDetail(
          "medication_reconciliation",
          normalizedEvidence,
          "Medication discrepancies are unresolved.",
        ),
      )}`,
      evidence: evidenceForCategory("medication_reconciliation"),
      actionability:
        "Resolve medication discrepancies and publish one finalized discharge medication list. Complete when all active inpatient-only orders are reconciled and restart timing/instructions are explicit.",
    }));
  }

  if (
    !input.follow_up_and_referrals.appointments_scheduled ||
    input.follow_up_and_referrals.missing_referrals.length > 0 ||
    hasNonStructuredBlockingEvidence("follow_up_and_referrals", normalizedEvidence)
  ) {
    blockers.push(withProvenance({
      id: "blocker-follow-up-and-referrals",
      category: "follow_up_and_referrals",
      priority: "medium",
      description: `Follow-up coordination is incomplete. ${formatGaps(
        input.follow_up_and_referrals.missing_referrals,
        buildExternalEvidenceDetail(
          "follow_up_and_referrals",
          normalizedEvidence,
          "Required appointments or referrals are not fully confirmed.",
        ),
      )}`,
      evidence: evidenceForCategory("follow_up_and_referrals"),
      actionability:
        "Schedule required follow-up/referrals and include date, location, and contact details in the transition packet before discharge.",
    }));
  }

  if (
    !input.patient_education.teach_back_complete ||
    input.patient_education.documented_gaps.length > 0 ||
    hasNonStructuredBlockingEvidence("patient_education", normalizedEvidence)
  ) {
    blockers.push(withProvenance({
      id: "blocker-patient-education",
      category: "patient_education",
      priority: "medium",
      description: `Discharge education remains incomplete. ${formatGaps(
        input.patient_education.documented_gaps,
        buildExternalEvidenceDetail(
          "patient_education",
          normalizedEvidence,
          "Teach-back and escalation instructions are not yet documented as complete.",
        ),
      )}`,
      evidence: evidenceForCategory("patient_education"),
      actionability:
        "Complete teach-back for warning signs, medication use, and escalation pathways, then document patient understanding in the discharge note.",
    }));
  }

  if (
    !input.home_support_and_services.caregiver_confirmed ||
    !input.home_support_and_services.services_confirmed ||
    input.home_support_and_services.documented_gaps.length > 0 ||
    hasNonStructuredBlockingEvidence("home_support_and_services", normalizedEvidence)
  ) {
    blockers.push(withProvenance({
      id: "blocker-home-support-and-services",
      category: "home_support_and_services",
      priority: "high",
      description: `Home support is not fully confirmed. ${formatGaps(
        input.home_support_and_services.documented_gaps,
        buildExternalEvidenceDetail(
          "home_support_and_services",
          normalizedEvidence,
          "Caregiver coverage and home services remain unverified.",
        ),
      )}`,
      evidence: evidenceForCategory("home_support_and_services"),
      actionability:
        "Confirm caregiver availability and required home services with named contacts and start timing documented in the discharge plan.",
    }));
  }

  if (
    !input.equipment_and_transport.transport_confirmed ||
    !input.equipment_and_transport.equipment_ready ||
    input.equipment_and_transport.documented_gaps.length > 0 ||
    hasNonStructuredBlockingEvidence("equipment_and_transport", normalizedEvidence)
  ) {
    blockers.push(withProvenance({
      id: "blocker-equipment-and-transport",
      category: "equipment_and_transport",
      priority:
        !input.equipment_and_transport.equipment_ready ||
          !input.equipment_and_transport.transport_confirmed
          ? "high"
          : "medium",
      description: `Discharge logistics are incomplete. ${formatGaps(
        input.equipment_and_transport.documented_gaps,
        buildExternalEvidenceDetail(
          "equipment_and_transport",
          normalizedEvidence,
          "Transport and required equipment status are not fully confirmed.",
        ),
      )}`,
      evidence: evidenceForCategory("equipment_and_transport"),
      actionability:
        "Confirm equipment delivery and transportation timing with an explicit handoff timestamp before patient departure.",
    }));
  }

  if (
    !input.administrative_and_documentation.discharge_documents_complete ||
    input.administrative_and_documentation.documented_gaps.length > 0 ||
    hasNonStructuredBlockingEvidence("administrative_and_documentation", normalizedEvidence)
  ) {
    blockers.push(withProvenance({
      id: "blocker-administrative-and-documentation",
      category: "administrative_and_documentation",
      priority: "medium",
      description: `Administrative discharge documentation is incomplete. ${formatGaps(
        input.administrative_and_documentation.documented_gaps,
        buildExternalEvidenceDetail(
          "administrative_and_documentation",
          normalizedEvidence,
          "Required discharge forms and sign-offs are not fully completed.",
        ),
      )}`,
      evidence: evidenceForCategory("administrative_and_documentation"),
      actionability:
        "Complete required discharge documents, finalize sign-offs, and verify the transition packet is complete before patient departure.",
    }));
  }

  const seenCategories = new Set(blockers.map((blocker) => blocker.category));
  const allCategories = Object.keys(CATEGORY_ORDER) as BlockerCategory[];
  for (const category of allCategories) {
    const uncertaintyPhrase = buildEvidenceConflictOrUncertaintyPhrase(category, normalizedEvidence);
    if (!uncertaintyPhrase) {
      continue;
    }

    if (!seenCategories.has(category)) {
      blockers.push(withProvenance({
        id: BLOCKER_ID_BY_CATEGORY[category],
        category,
        priority: EVIDENCE_UNCERTAINTY_PRIORITY[category],
        description:
          `Readiness evidence remains unresolved for ${CATEGORY_LABEL[category]}. ${uncertaintyPhrase}`,
        evidence: evidenceForCategory(category),
        actionability: EVIDENCE_UNCERTAINTY_ACTION[category],
      }));
      seenCategories.add(category);
      continue;
    }

    const existing = blockers.find((blocker) => blocker.category === category);
    if (existing && !existing.description.includes("Evidence conflict") &&
      !existing.description.includes("Evidence uncertainty")) {
      existing.description = `${existing.description} ${uncertaintyPhrase}`;
    }
  }

  return sortedByPriority(blockers);
};

export const buildDischargeWorkflowCore = (input: ReadinessInput): WorkflowCoreResult => {
  assertValidReadinessInput(input);

  const normalizedEvidence = buildNormalizedEvidenceBundle(input);
  const blockers = buildCoreBlockers(input, normalizedEvidence);
  assertEvidenceCoverage(blockers, normalizedEvidence.evidence_catalog);

  const next_steps = buildTransitionTasks(blockers);
  const evidence = buildEvidenceTrace(
    blockers,
    normalizedEvidence.evidence_catalog,
    normalizedEvidence,
    next_steps,
  );
  const verdict = determineVerdict(blockers);
  const summary = buildSummary(verdict, blockers);

  return {
    verdict,
    blockers,
    evidence,
    next_steps,
    summary,
    normalized_evidence: normalizedEvidence,
  };
};

export const buildAssessDischargeReadinessResponse = (
  input: ReadinessInput,
): AssessDischargeReadinessResponse => {
  const core = buildDischargeWorkflowCore(input);
  return {
    verdict: core.verdict,
    blockers: core.blockers,
    evidence: core.evidence,
    next_steps: core.next_steps,
    summary: core.summary,
  };
};

export const buildExtractDischargeBlockersResponse = (
  input: ReadinessInput,
): ExtractDischargeBlockersResponse => {
  const core = buildDischargeWorkflowCore(input);
  return {
    verdict: core.verdict,
    blockers: core.blockers,
    evidence: core.evidence,
    summary:
      `Extracted ${core.blockers.length} discharge blockers with source-linked evidence and trust markers for clinician review.`,
  };
};

export const buildGenerateTransitionPlanResponse = (
  input: ReadinessInput,
): GenerateTransitionPlanResponse => {
  const core = buildDischargeWorkflowCore(input);
  return {
    verdict: core.verdict,
    blockers: core.blockers,
    evidence: core.evidence,
    next_steps: core.next_steps,
    summary:
      `Generated ${core.next_steps.length} prioritized transition tasks with blocker-to-evidence traceability.`,
  };
};
