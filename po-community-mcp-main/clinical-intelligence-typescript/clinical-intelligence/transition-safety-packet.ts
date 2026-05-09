import {
  CANONICAL_BLOCKER_CATEGORIES,
  CANONICAL_VERDICTS,
  HiddenRiskInput,
  HiddenRiskOutput,
} from "./contract";

export type CanonicalVerdict = (typeof CANONICAL_VERDICTS)[number];
export type CanonicalBlockerCategory = (typeof CANONICAL_BLOCKER_CATEGORIES)[number];
export type SafetyInvariantStatus = "pass" | "fail";

export type SafetyInvariants = {
  structured_baseline_preserved: SafetyInvariantStatus;
  no_uncited_escalation: SafetyInvariantStatus;
  no_ready_with_active_hidden_blocker: SafetyInvariantStatus;
  manual_review_on_uncertainty: SafetyInvariantStatus;
  duplicate_signal_suppression: SafetyInvariantStatus;
  no_task_without_fhir_source: SafetyInvariantStatus;
};

export type FhirEvidenceLedgerItem = {
  reference: string;
  resource_type: string;
  resource_id: string;
  timestamp?: string;
  role:
    | "structured_baseline"
    | "narrative_evidence"
    | "controlling_evidence"
    | "superseded_evidence"
    | "resolution_evidence";
  summary: string;
  supports: CanonicalBlockerCategory[];
  source: "FHIR";
};

export type FhirReadRecord = {
  reference: string;
  resource_type: string;
  resource_id: string;
  timestamp?: string;
  summary: string;
};

export type FhirWriteRecord = {
  reference: string;
  resource_type: string;
  resource_id: string;
  timestamp?: string;
  summary: string;
  linked_evidence_references?: string[];
};

type FhirContextReadRecord = NonNullable<HiddenRiskInput["fhir_context"]>["fhir_resources_read"][number];

export type TransitionSafetyPacket = {
  packet_type: "transition_safety_packet";
  contract_version: "phase9_transition_safety_packet_v1";
  patient: {
    patient_id: string | null;
    encounter_id: string | null;
    display_name?: string;
    planned_disposition?: string;
  };
  structured_baseline: {
    source: "Discharge Gatekeeper MCP";
    verdict: CanonicalVerdict;
    summary: string;
    evidence: string[];
    blockers: Array<{
      blocker_id: string;
      category: CanonicalBlockerCategory;
      description: string;
      severity?: "low" | "medium" | "high";
    }>;
  };
  narrative_review: {
    source: "Clinical Intelligence MCP";
    status: HiddenRiskOutput["status"];
    hidden_risk_result: HiddenRiskOutput["hidden_risk_summary"]["result"];
    contradiction_summary: string;
    citations: Array<{
      source_label: string;
      excerpt: string;
      fhir_reference?: string;
    }>;
  };
  fhir_server: string | null;
  fhir_resources_read: FhirReadRecord[];
  structured_evidence: FhirEvidenceLedgerItem[];
  narrative_evidence: FhirEvidenceLedgerItem[];
  controlling_evidence: FhirEvidenceLedgerItem[];
  superseded_evidence: FhirEvidenceLedgerItem[];
  resolution_evidence: FhirEvidenceLedgerItem[];
  fhir_resources_written: FhirWriteRecord[];
  reconciled_transition_status: {
    final_verdict: CanonicalVerdict;
    why_changed: string;
    blocker_categories: CanonicalBlockerCategory[];
    manual_review_required: boolean;
  };
  action_router: Array<{
    owner: string;
    action: string;
    timing: string;
    release_condition: string;
  }>;
  safety_invariants: SafetyInvariants;
  trace: {
    dgk_mcp_used: boolean;
    clinical_intelligence_mcp_used: boolean;
    a2a_orchestrator_supported: boolean;
    request_id: string | null;
    task_id: string | null;
    provider: string | null;
    model: string | null;
  };
};

type TransitionSafetyPacketInput = {
  input: HiddenRiskInput;
  hiddenRisk: HiddenRiskOutput;
  finalVerdict: CanonicalVerdict;
  blockerCategories: string[];
  actionRouter: TransitionSafetyPacket["action_router"];
  trace?: Partial<TransitionSafetyPacket["trace"]>;
  provider?: string | null;
  model?: string | null;
};

type InvariantInput = {
  structuredBaselineVisible: boolean;
  structuredBaselineVerdict: CanonicalVerdict;
  finalVerdict: CanonicalVerdict;
  hiddenRisk: HiddenRiskOutput;
};

const isCanonicalBlockerCategory = (value: string): value is CanonicalBlockerCategory => {
  return (CANONICAL_BLOCKER_CATEGORIES as readonly string[]).includes(value);
};

const uniqueCanonicalCategories = (values: string[]): CanonicalBlockerCategory[] => {
  const categories = values.filter(isCanonicalBlockerCategory);
  return [...new Set(categories)];
};

const activeHiddenRiskFindings = (
  hiddenRisk: HiddenRiskOutput,
): HiddenRiskOutput["hidden_risk_findings"] => {
  return hiddenRisk.hidden_risk_findings.filter(
    (finding) => finding.recommended_orchestrator_action !== "ignore_duplicate",
  );
};

export const evaluateSafetyInvariants = ({
  structuredBaselineVisible,
  structuredBaselineVerdict,
  finalVerdict,
  hiddenRisk,
}: InvariantInput): SafetyInvariants => {
  const activeFindings = activeHiddenRiskFindings(hiddenRisk);
  const hasHiddenRiskEscalation =
    hiddenRisk.hidden_risk_summary.result === "hidden_risk_present" &&
    hiddenRisk.hidden_risk_summary.overall_disposition_impact !== "none";
  const hasActiveNotReadyBlocker = activeFindings.some(
    (finding) => finding.disposition_impact === "not_ready",
  );
  const hasUncertainty =
    hiddenRisk.status === "error" ||
    hiddenRisk.status === "insufficient_context" ||
    hiddenRisk.status === "inconclusive" ||
    hiddenRisk.hidden_risk_summary.result === "inconclusive" ||
    hiddenRisk.hidden_risk_summary.overall_disposition_impact === "uncertain";
  const hasDuplicateActiveFinding = activeFindings.some(
    (finding) =>
      finding.recommended_orchestrator_action === "ignore_duplicate" ||
      finding.is_duplicate_of_blocker_id !== null,
  );

  return {
    structured_baseline_preserved:
      structuredBaselineVisible && Boolean(structuredBaselineVerdict) ? "pass" : "fail",
    no_uncited_escalation:
      hasHiddenRiskEscalation && hiddenRisk.citations.length === 0 ? "fail" : "pass",
    no_ready_with_active_hidden_blocker:
      hasActiveNotReadyBlocker && finalVerdict === "ready" ? "fail" : "pass",
    manual_review_on_uncertainty:
      hasUncertainty && !hiddenRisk.hidden_risk_summary.manual_review_required && finalVerdict === "ready"
        ? "fail"
        : "pass",
    duplicate_signal_suppression: hasDuplicateActiveFinding ? "fail" : "pass",
    no_task_without_fhir_source: "pass",
  };
};

const buildWhyChanged = (
  structuredBaselineVerdict: CanonicalVerdict,
  hiddenRisk: HiddenRiskOutput,
  finalVerdict: CanonicalVerdict,
): string => {
  if (hiddenRisk.hidden_risk_summary.result === "hidden_risk_present") {
    return `The structured chart looked ${structuredBaselineVerdict}, but cited narrative evidence created active transition blockers: ${hiddenRisk.hidden_risk_summary.summary}`;
  }

  if (hiddenRisk.hidden_risk_summary.result === "inconclusive") {
    return `The structured chart looked ${structuredBaselineVerdict}, but narrative review was inconclusive and requires manual clinician review.`;
  }

  return `Structured baseline ${structuredBaselineVerdict} was preserved; narrative review did not add a discharge-changing hidden risk, so final status is ${finalVerdict}.`;
};

const buildNarrativeSupportMap = (
  hiddenRisk: HiddenRiskOutput,
): Map<string, CanonicalBlockerCategory[]> => {
  const supportMap = new Map<string, CanonicalBlockerCategory[]>();

  for (const finding of activeHiddenRiskFindings(hiddenRisk)) {
    for (const citationId of finding.citation_ids) {
      const current = supportMap.get(citationId) ?? [];
      if (isCanonicalBlockerCategory(finding.category) && !current.includes(finding.category)) {
        current.push(finding.category);
      }
      supportMap.set(citationId, current);
    }
  }

  return supportMap;
};

const toLedgerItemFromDeterministicEvidence = (
  evidence: HiddenRiskInput["deterministic_snapshot"]["deterministic_evidence"][number],
  role: FhirEvidenceLedgerItem["role"],
): FhirEvidenceLedgerItem | null => {
  if (!evidence.fhir_reference || !evidence.fhir_resource_type || !evidence.fhir_resource_id) {
    return null;
  }

  return {
    reference: evidence.fhir_reference,
    resource_type: evidence.fhir_resource_type,
    resource_id: evidence.fhir_resource_id,
    timestamp: evidence.fhir_timestamp,
    role,
    summary: evidence.detail || evidence.source_label,
    supports: [],
    source: "FHIR",
  };
};

const toLedgerItemFromReadRecord = (
  record: FhirContextReadRecord,
  role: FhirEvidenceLedgerItem["role"],
): FhirEvidenceLedgerItem => {
  return {
    reference: record.reference,
    resource_type: record.resource_type,
    resource_id: record.resource_id,
    timestamp: record.timestamp,
    role,
    summary: record.summary,
    supports: [],
    source: "FHIR",
  };
};

const toLedgerItemFromCitation = (
  citation: HiddenRiskOutput["citations"][number],
  role: FhirEvidenceLedgerItem["role"],
  supports: CanonicalBlockerCategory[],
): FhirEvidenceLedgerItem | null => {
  if (!citation.fhir_reference || !citation.fhir_resource_type || !citation.fhir_resource_id) {
    return null;
  }

  return {
    reference: citation.fhir_reference,
    resource_type: citation.fhir_resource_type,
    resource_id: citation.fhir_resource_id,
    timestamp: citation.timestamp,
    role,
    summary: citation.excerpt,
    supports,
    source: "FHIR",
  };
};

export const buildTransitionSafetyPacket = ({
  input,
  hiddenRisk,
  finalVerdict,
  blockerCategories,
  actionRouter,
  trace,
  provider,
  model,
}: TransitionSafetyPacketInput): TransitionSafetyPacket => {
  const deterministic = input.deterministic_snapshot;
  const categories = uniqueCanonicalCategories(blockerCategories);
  const manualReviewRequired =
    hiddenRisk.hidden_risk_summary.manual_review_required || finalVerdict !== "ready";
  const safetyInvariants = evaluateSafetyInvariants({
    structuredBaselineVisible: true,
    structuredBaselineVerdict: deterministic.baseline_verdict,
    finalVerdict,
    hiddenRisk,
  });
  const narrativeSupportMap = buildNarrativeSupportMap(hiddenRisk);
  const structuredEvidence = deterministic.deterministic_evidence
    .map((evidence) => toLedgerItemFromDeterministicEvidence(evidence, "structured_baseline"))
    .filter((item): item is FhirEvidenceLedgerItem => Boolean(item));
  const fallbackStructuredEvidence =
    structuredEvidence.length === 0
      ? (input.fhir_context?.fhir_resources_read ?? [])
          .filter((record) =>
            !["DocumentReference", "PractitionerRole"].includes(record.resource_type),
          )
          .map((record) => toLedgerItemFromReadRecord(record, "structured_baseline"))
      : [];
  const narrativeEvidence = hiddenRisk.citations
    .map((citation) =>
      toLedgerItemFromCitation(
        citation,
        "narrative_evidence",
        narrativeSupportMap.get(citation.citation_id) ?? [],
      ),
    )
    .filter((item): item is FhirEvidenceLedgerItem => Boolean(item));
  const controllingEvidence = hiddenRisk.citations
    .filter((citation) => narrativeSupportMap.has(citation.citation_id))
    .map((citation) =>
      toLedgerItemFromCitation(
        citation,
        "controlling_evidence",
        narrativeSupportMap.get(citation.citation_id) ?? [],
      ),
    )
    .filter((item): item is FhirEvidenceLedgerItem => Boolean(item));
  const supersededEvidence =
    hiddenRisk.hidden_risk_summary.result === "hidden_risk_present" && finalVerdict !== deterministic.baseline_verdict
      ? structuredEvidence.map((item) => ({ ...item, role: "superseded_evidence" as const }))
      : [];
  const fhirResourcesRead = input.fhir_context?.fhir_resources_read ?? [];

  return {
    packet_type: "transition_safety_packet",
    contract_version: "phase9_transition_safety_packet_v1",
    patient: {
      patient_id: deterministic.patient_id ?? null,
      encounter_id: deterministic.encounter_id ?? null,
      ...(input.fhir_context?.optional_context_metadata?.discharge_destination
        ? { planned_disposition: input.fhir_context.optional_context_metadata.discharge_destination }
        : {}),
    },
    structured_baseline: {
      source: "Discharge Gatekeeper MCP",
      verdict: deterministic.baseline_verdict,
      summary: deterministic.deterministic_summary,
      evidence: deterministic.deterministic_evidence.map((evidence) =>
        evidence.detail ? `${evidence.source_label}: ${evidence.detail}` : evidence.source_label,
      ),
      blockers: deterministic.deterministic_blockers,
    },
    narrative_review: {
      source: "Clinical Intelligence MCP",
      status: hiddenRisk.status,
      hidden_risk_result: hiddenRisk.hidden_risk_summary.result,
      contradiction_summary: hiddenRisk.hidden_risk_summary.summary,
      citations: hiddenRisk.citations.map((citation) => ({
        source_label: citation.source_label,
        excerpt: citation.excerpt,
        fhir_reference: citation.fhir_reference,
      })),
    },
    fhir_server: input.fhir_context?.fhir_server ?? null,
    fhir_resources_read: fhirResourcesRead,
    structured_evidence: structuredEvidence.length > 0 ? structuredEvidence : fallbackStructuredEvidence,
    narrative_evidence: narrativeEvidence,
    controlling_evidence: controllingEvidence,
    superseded_evidence: supersededEvidence,
    resolution_evidence: [],
    fhir_resources_written: [],
    reconciled_transition_status: {
      final_verdict: finalVerdict,
      why_changed: buildWhyChanged(deterministic.baseline_verdict, hiddenRisk, finalVerdict),
      blocker_categories: categories,
      manual_review_required: manualReviewRequired,
    },
    action_router: actionRouter,
    safety_invariants: safetyInvariants,
    trace: {
      dgk_mcp_used: true,
      clinical_intelligence_mcp_used: hiddenRisk.status !== "error",
      a2a_orchestrator_supported: true,
      request_id: null,
      task_id: null,
      provider: provider ?? null,
      model: model ?? null,
      ...trace,
    },
  };
};

export const allSafetyInvariantsPass = (invariants: SafetyInvariants): boolean => {
  return Object.values(invariants).every((status) => status === "pass");
};
