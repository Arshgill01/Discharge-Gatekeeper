import {
  EvidenceAssertion,
  BlockerCategory,
  EvidenceAmbiguity,
  EvidenceContradiction,
  EvidenceRecord,
  EvidenceSourceType,
  MissingEvidenceMarker,
  NormalizedEvidenceBundle,
  NormalizedEvidenceSignal,
  ReadinessInput,
} from "./contract";

type RequiredSignalSpec = {
  category: BlockerCategory;
  signal_key: string;
  expected_sources: EvidenceSourceType[];
};

const REQUIRED_SIGNAL_SPECS: RequiredSignalSpec[] = [
  {
    category: "clinical_stability",
    signal_key: "vitals_stable",
    expected_sources: ["structured"],
  },
  {
    category: "clinical_stability",
    signal_key: "oxygen_requirement",
    expected_sources: ["structured"],
  },
  {
    category: "pending_diagnostics",
    signal_key: "diagnostics_status",
    expected_sources: ["structured"],
  },
  {
    category: "medication_reconciliation",
    signal_key: "medication_reconciliation_status",
    expected_sources: ["structured", "note"],
  },
  {
    category: "follow_up_and_referrals",
    signal_key: "follow_up_coordination_status",
    expected_sources: ["structured", "note"],
  },
  {
    category: "patient_education",
    signal_key: "teach_back_status",
    expected_sources: ["structured", "note"],
  },
  {
    category: "home_support_and_services",
    signal_key: "home_support_status",
    expected_sources: ["structured", "note"],
  },
  {
    category: "equipment_and_transport",
    signal_key: "equipment_and_transport_status",
    expected_sources: ["structured", "note"],
  },
  {
    category: "administrative_and_documentation",
    signal_key: "documentation_status",
    expected_sources: ["structured"],
  },
];

const SOURCE_PRIORITY: Record<EvidenceSourceType, number> = {
  note: 1,
  document: 2,
  structured: 3,
};

const signalGroupKey = (category: BlockerCategory, signalKey: string): string => {
  return `${category}::${signalKey}`;
};

const stableSortSignals = (
  a: NormalizedEvidenceSignal,
  b: NormalizedEvidenceSignal,
): number => {
  const categoryDelta = a.category.localeCompare(b.category);
  if (categoryDelta !== 0) {
    return categoryDelta;
  }

  const signalKeyDelta = a.signal_key.localeCompare(b.signal_key);
  if (signalKeyDelta !== 0) {
    return signalKeyDelta;
  }

  const sourceDelta = SOURCE_PRIORITY[a.source_type] - SOURCE_PRIORITY[b.source_type];
  if (sourceDelta !== 0) {
    return sourceDelta;
  }

  return a.id.localeCompare(b.id);
};

const upsertEvidence = (index: Map<string, EvidenceRecord>, evidence: EvidenceRecord): void => {
  if (!index.has(evidence.id)) {
    index.set(evidence.id, evidence);
  }
};

const formatIssueSummary = (issues: string[], fallback: string): string => {
  return issues.length > 0 ? issues.join(" ") : fallback;
};

const getStructuredAssertionForState = (
  state: "supports_readiness" | "blocks_readiness",
): EvidenceAssertion => {
  return state === "blocks_readiness" ? "supports_blocker" : "supports_readiness";
};

const structuredEvidenceMatchesSignal = (
  evidence: EvidenceRecord,
  signalKey: string,
): boolean => {
  const tokens = signalKey.toLowerCase().split("_");
  const haystack =
    `${evidence.id} ${evidence.source_label} ${evidence.detail}`.toLowerCase();
  return tokens.every((token) => haystack.includes(token));
};

const pickStructuredEvidenceSource = (
  evidenceIndex: Map<string, EvidenceRecord>,
  category: BlockerCategory,
  signalKey: string,
  state: "supports_readiness" | "blocks_readiness",
): EvidenceRecord | null => {
  const desiredAssertion = getStructuredAssertionForState(state);
  const candidates = [...evidenceIndex.values()].filter((evidence) => {
    return evidence.source_type === "structured" && evidence.category === category;
  });

  const preferredCandidate = candidates.find((evidence) => {
    return evidence.assertion === desiredAssertion &&
      structuredEvidenceMatchesSignal(evidence, signalKey);
  }) ??
    candidates.find((evidence) => evidence.assertion === desiredAssertion) ??
    candidates.find((evidence) => structuredEvidenceMatchesSignal(evidence, signalKey)) ??
    candidates[0];

  return preferredCandidate ?? null;
};

const normalizeStructuredSignals = (
  input: ReadinessInput,
  evidenceIndex: Map<string, EvidenceRecord>,
): NormalizedEvidenceSignal[] => {
  const signals: NormalizedEvidenceSignal[] = [];

  const pushStructuredSignal = (
    category: BlockerCategory,
    signalKey: string,
    state: "supports_readiness" | "blocks_readiness",
    detail: string,
  ): void => {
    const sourceRecord = pickStructuredEvidenceSource(
      evidenceIndex,
      category,
      signalKey,
      state,
    ) ?? {
      id: `structured-${category}-${signalKey}`,
      source_type: "structured" as const,
      source_label: `Structured/${category}`,
      detail,
      category,
      assertion: getStructuredAssertionForState(state),
    };
    upsertEvidence(evidenceIndex, sourceRecord);

    signals.push({
      id: `signal-${sourceRecord.id}-${signalKey}`,
      category,
      signal_key: signalKey,
      state,
      source_id: sourceRecord.id,
      source_type: sourceRecord.source_type,
      source_label: sourceRecord.source_label,
      detail,
    });
  };

  pushStructuredSignal(
    "clinical_stability",
    "vitals_stable",
    input.clinical_stability.vitals_stable ? "supports_readiness" : "blocks_readiness",
    input.clinical_stability.vitals_stable
      ? "Vital signs are documented as stable."
      : "Vital signs are not documented as stable.",
  );

  const oxygenAboveBaseline =
    input.clinical_stability.oxygen_lpm > input.clinical_stability.baseline_oxygen_lpm;
  pushStructuredSignal(
    "clinical_stability",
    "oxygen_requirement",
    oxygenAboveBaseline ? "blocks_readiness" : "supports_readiness",
    `Oxygen requirement: ${input.clinical_stability.oxygen_lpm} L/min; baseline: ${input.clinical_stability.baseline_oxygen_lpm} L/min.`,
  );

  const diagnosticsBlocked =
    input.pending_diagnostics.critical_results_pending ||
    input.pending_diagnostics.pending_items.length > 0;
  pushStructuredSignal(
    "pending_diagnostics",
    "diagnostics_status",
    diagnosticsBlocked ? "blocks_readiness" : "supports_readiness",
    diagnosticsBlocked
      ? `Diagnostics pending: ${formatIssueSummary(
          input.pending_diagnostics.pending_items,
          "Critical diagnostic follow-up remains open.",
        )}`
      : "No discharge-critical diagnostics are pending.",
  );

  const medRecBlocked =
    !input.medication_reconciliation.reconciliation_complete ||
    input.medication_reconciliation.unresolved_issues.length > 0;
  pushStructuredSignal(
    "medication_reconciliation",
    "medication_reconciliation_status",
    medRecBlocked ? "blocks_readiness" : "supports_readiness",
    medRecBlocked
      ? formatIssueSummary(
          input.medication_reconciliation.unresolved_issues,
          "Medication reconciliation remains incomplete.",
        )
      : "Medication reconciliation documented as complete.",
  );

  const followUpBlocked =
    !input.follow_up_and_referrals.appointments_scheduled ||
    input.follow_up_and_referrals.missing_referrals.length > 0;
  pushStructuredSignal(
    "follow_up_and_referrals",
    "follow_up_coordination_status",
    followUpBlocked ? "blocks_readiness" : "supports_readiness",
    followUpBlocked
      ? formatIssueSummary(
          input.follow_up_and_referrals.missing_referrals,
          "Follow-up and referral coordination remains incomplete.",
        )
      : "Required follow-up and referrals are documented as scheduled.",
  );

  const educationBlocked =
    !input.patient_education.teach_back_complete ||
    input.patient_education.documented_gaps.length > 0;
  pushStructuredSignal(
    "patient_education",
    "teach_back_status",
    educationBlocked ? "blocks_readiness" : "supports_readiness",
    educationBlocked
      ? formatIssueSummary(
          input.patient_education.documented_gaps,
          "Teach-back is not documented as complete.",
        )
      : "Teach-back and warning-sign education are documented as complete.",
  );

  const homeSupportBlocked =
    !input.home_support_and_services.caregiver_confirmed ||
    !input.home_support_and_services.services_confirmed ||
    input.home_support_and_services.documented_gaps.length > 0;
  pushStructuredSignal(
    "home_support_and_services",
    "home_support_status",
    homeSupportBlocked ? "blocks_readiness" : "supports_readiness",
    homeSupportBlocked
      ? formatIssueSummary(
          input.home_support_and_services.documented_gaps,
          "Caregiver support and home services are not fully confirmed.",
        )
      : "Caregiver support and required home services are confirmed.",
  );

  const equipmentBlocked =
    !input.equipment_and_transport.transport_confirmed ||
    !input.equipment_and_transport.equipment_ready ||
    input.equipment_and_transport.documented_gaps.length > 0;
  pushStructuredSignal(
    "equipment_and_transport",
    "equipment_and_transport_status",
    equipmentBlocked ? "blocks_readiness" : "supports_readiness",
    equipmentBlocked
      ? formatIssueSummary(
          input.equipment_and_transport.documented_gaps,
          "Required equipment/transport is not fully coordinated.",
        )
      : "Transport and discharge equipment are documented as ready.",
  );

  const documentationBlocked =
    !input.administrative_and_documentation.discharge_documents_complete ||
    input.administrative_and_documentation.documented_gaps.length > 0;
  pushStructuredSignal(
    "administrative_and_documentation",
    "documentation_status",
    documentationBlocked ? "blocks_readiness" : "supports_readiness",
    documentationBlocked
      ? formatIssueSummary(
          input.administrative_and_documentation.documented_gaps,
          "Discharge documentation remains incomplete.",
        )
      : "Administrative discharge documentation is complete.",
  );

  return signals.sort(stableSortSignals);
};

const inferLegacyNoteCategory = (evidence: EvidenceRecord): BlockerCategory => {
  const text = `${evidence.id} ${evidence.source_label} ${evidence.detail}`.toLowerCase();

  if (text.includes("med")) {
    return "medication_reconciliation";
  }
  if (text.includes("follow") || text.includes("referral")) {
    return "follow_up_and_referrals";
  }
  if (text.includes("teach") || text.includes("education")) {
    return "patient_education";
  }
  if (text.includes("caregiver") || text.includes("service")) {
    return "home_support_and_services";
  }
  if (
    text.includes("transport") ||
    text.includes("equipment") ||
    text.includes("oxygen delivery") ||
    text.includes("vendor")
  ) {
    return "equipment_and_transport";
  }
  if (text.includes("diagnostic") || text.includes("lab")) {
    return "pending_diagnostics";
  }
  if (text.includes("admin") || text.includes("documentation")) {
    return "administrative_and_documentation";
  }
  return "clinical_stability";
};

const mapAssertionToSignalState = (
  assertion: EvidenceAssertion,
): "supports_readiness" | "blocks_readiness" | "ambiguous" => {
  if (assertion === "supports_blocker") {
    return "blocks_readiness";
  }

  if (assertion === "supports_readiness") {
    return "supports_readiness";
  }

  return "ambiguous";
};

const normalizeNoteDocumentSignals = (
  input: ReadinessInput,
  evidenceIndex: Map<string, EvidenceRecord>,
): NormalizedEvidenceSignal[] => {
  const signals: NormalizedEvidenceSignal[] = [];

  if (input.note_documents && input.note_documents.length > 0) {
    for (const document of input.note_documents) {
      for (const signal of document.signals) {
        const sourceId = signal.source_evidence_id ??
          `${document.source_type}-${document.id}-${signal.id}`;
        const sourceRecord = evidenceIndex.get(sourceId) ?? {
          id: sourceId,
          source_type: document.source_type,
          source_label: document.source_label,
          detail: signal.detail,
        };
        upsertEvidence(evidenceIndex, sourceRecord);

        signals.push({
          id: `signal-${document.id}-${signal.id}`,
          category: signal.category,
          signal_key: signal.signal_key,
          state: signal.state,
          source_id: sourceRecord.id,
          source_type: sourceRecord.source_type,
          source_label: sourceRecord.source_label,
          detail: signal.detail,
        });
      }
    }

    return signals.sort(stableSortSignals);
  }

  for (const evidence of input.evidence_catalog) {
    if (evidence.source_type !== "note" && evidence.source_type !== "document") {
      continue;
    }

    const category = evidence.category ?? inferLegacyNoteCategory(evidence);
    const signalKey = evidence.assertion
      ? `assertion_${category}`
      : `legacy_${category}_note_signal`;
    const state = evidence.assertion
      ? mapAssertionToSignalState(evidence.assertion)
      : "blocks_readiness";

    signals.push({
      id: `signal-legacy-${evidence.id}`,
      category,
      signal_key: signalKey,
      state,
      source_id: evidence.id,
      source_type: evidence.source_type,
      source_label: evidence.source_label,
      detail: evidence.detail,
    });
  }

  return signals.sort(stableSortSignals);
};

const buildSignalGroups = (
  signals: NormalizedEvidenceSignal[],
): Map<string, NormalizedEvidenceSignal[]> => {
  const grouped = new Map<string, NormalizedEvidenceSignal[]>();

  for (const signal of signals) {
    const key = signalGroupKey(signal.category, signal.signal_key);
    const current = grouped.get(key) ?? [];
    current.push(signal);
    grouped.set(key, current);
  }

  return grouped;
};

const buildContradictions = (
  groupedSignals: Map<string, NormalizedEvidenceSignal[]>,
): EvidenceContradiction[] => {
  const contradictions: EvidenceContradiction[] = [];

  for (const [key, group] of groupedSignals.entries()) {
    const hasSupport = group.some((signal) => signal.state === "supports_readiness");
    const hasBlock = group.some((signal) => signal.state === "blocks_readiness");
    if (!hasSupport || !hasBlock) {
      continue;
    }

    const first = group[0];
    if (!first) {
      continue;
    }

    contradictions.push({
      id: `contradiction-${first.category}-${first.signal_key}`,
      category: first.category,
      signal_key: first.signal_key,
      signal_ids: [...new Set(group.map((signal) => signal.id))].sort(),
      source_ids: [...new Set(group.map((signal) => signal.source_id))].sort(),
      detail: `Conflicting evidence for ${key}: both readiness-supporting and blocker-supporting signals are present.`,
    });
  }

  return contradictions.sort((a, b) => a.id.localeCompare(b.id));
};

const buildAmbiguities = (
  groupedSignals: Map<string, NormalizedEvidenceSignal[]>,
): EvidenceAmbiguity[] => {
  const ambiguities: EvidenceAmbiguity[] = [];

  for (const [key, group] of groupedSignals.entries()) {
    const ambiguousSignals = group.filter((signal) => signal.state === "ambiguous");
    if (ambiguousSignals.length === 0) {
      continue;
    }

    const first = group[0];
    if (!first) {
      continue;
    }

    ambiguities.push({
      id: `ambiguity-${first.category}-${first.signal_key}`,
      category: first.category,
      signal_key: first.signal_key,
      signal_ids: ambiguousSignals.map((signal) => signal.id).sort(),
      source_ids: [...new Set(ambiguousSignals.map((signal) => signal.source_id))].sort(),
      detail: `Ambiguous evidence for ${key} requires clinician confirmation before final discharge decision.`,
    });
  }

  return ambiguities.sort((a, b) => a.id.localeCompare(b.id));
};

const buildMissingEvidenceMarkers = (
  groupedSignals: Map<string, NormalizedEvidenceSignal[]>,
): MissingEvidenceMarker[] => {
  const markers: MissingEvidenceMarker[] = [];

  for (const spec of REQUIRED_SIGNAL_SPECS) {
    const key = signalGroupKey(spec.category, spec.signal_key);
    const group = groupedSignals.get(key) ?? [];

    if (group.length === 0) {
      for (const sourceType of spec.expected_sources) {
        markers.push({
          id: `missing-${spec.category}-${spec.signal_key}-${sourceType}`,
          category: spec.category,
          signal_key: spec.signal_key,
          expected_source: sourceType,
          detail:
            `Missing required ${sourceType} evidence signal for ${spec.category}:${spec.signal_key}.`,
        });
      }
      continue;
    }

    for (const sourceType of spec.expected_sources) {
      const sourcePresent = group.some((signal) => signal.source_type === sourceType);
      if (sourcePresent) {
        continue;
      }

      markers.push({
        id: `missing-${spec.category}-${spec.signal_key}-${sourceType}`,
        category: spec.category,
        signal_key: spec.signal_key,
        expected_source: sourceType,
        detail:
          `Missing ${sourceType} corroboration for ${spec.category}:${spec.signal_key}.`,
      });
    }
  }

  return markers.sort((a, b) => a.id.localeCompare(b.id));
};

export const buildNormalizedEvidenceBundle = (
  input: ReadinessInput,
): NormalizedEvidenceBundle => {
  const evidenceIndex = new Map<string, EvidenceRecord>();
  for (const evidence of input.evidence_catalog) {
    upsertEvidence(evidenceIndex, evidence);
  }

  const structuredSignals = normalizeStructuredSignals(input, evidenceIndex);
  const noteDocumentSignals = normalizeNoteDocumentSignals(input, evidenceIndex);
  const allSignals = [...structuredSignals, ...noteDocumentSignals].sort(stableSortSignals);
  const groupedSignals = buildSignalGroups(allSignals);

  return {
    scenario_id: input.scenario_id,
    evidence_catalog: [...evidenceIndex.values()].sort((a, b) => a.id.localeCompare(b.id)),
    structured_signals: structuredSignals,
    note_document_signals: noteDocumentSignals,
    contradictions: buildContradictions(groupedSignals),
    ambiguities: buildAmbiguities(groupedSignals),
    missing_evidence: buildMissingEvidenceMarkers(groupedSignals),
  };
};

export const getEvidenceIdsForCategory = (
  bundle: NormalizedEvidenceBundle,
  category: BlockerCategory,
): string[] => {
  const selectedSignals = [...bundle.note_document_signals, ...bundle.structured_signals]
    .filter((signal) => {
      return signal.category === category &&
        (signal.state === "blocks_readiness" || signal.state === "ambiguous");
    })
    .sort((a, b) => stableSortSignals(a, b));

  const ids = [...new Set(selectedSignals.map((signal) => signal.source_id))];
  const firstId = ids[0];
  if (firstId) {
    return [firstId];
  }

  return bundle.missing_evidence
    .filter((marker) => marker.category === category)
    .map((marker) => marker.id)
    .slice(0, 2);
};
