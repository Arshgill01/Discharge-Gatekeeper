import { Request } from "express";
import { FhirClientInstance } from "../fhir-client";
import { FhirUtilities } from "../fhir-utilities";
import {
  BlockerCategory,
  EvidenceAssertion,
  EvidenceRecord,
  EvidenceSignalState,
  NoteDocumentInput,
  ReadinessInput,
} from "./contract";
import { resolveScenarioInput } from "./scenario-selection";

type FhirResourceLike = Record<string, unknown>;

type FhirBundleLike = {
  entry?: Array<{
    resource?: FhirResourceLike | null;
  }>;
};

type RetrievedDischargeContext = {
  patient_id: string;
  patient: FhirResourceLike | null;
  observations: FhirResourceLike[];
  medication_requests: FhirResourceLike[];
  medication_statements: FhirResourceLike[];
  service_requests: FhirResourceLike[];
  document_references: FhirResourceLike[];
  issues: string[];
};

export type WorkflowInputResolution = {
  input: ReadinessInput;
  source: "live_fhir" | "synthetic_fallback";
  context_status: "complete" | "partial" | "missing";
  issues: string[];
  fallback_used: boolean;
  patient_id: string | null;
};

type ResolveWorkflowInputOptions = {
  scenarioId?: string;
  allowSyntheticFallback?: boolean;
  fetchContext?: (
    req: Request,
    patientId: string,
  ) => Promise<RetrievedDischargeContext>;
};

type DerivedNoteSignal = {
  category: BlockerCategory;
  signal_key: string;
  state: EvidenceSignalState;
  detail: string;
  assertion: EvidenceAssertion;
};

type NoteCategoryPattern = {
  category: BlockerCategory;
  signal_key: string;
  blocker_patterns: RegExp[];
  support_patterns: RegExp[];
};

type NoteEvidenceSummary = {
  has_blocking: boolean;
  has_supporting: boolean;
  has_ambiguous: boolean;
  blocking_details: string[];
  supporting_details: string[];
  ambiguous_details: string[];
};

const DEFAULT_ALLOW_SYNTHETIC_FALLBACK = true;
const LIVE_CONTEXT_SCENARIO_PREFIX = "live_context_patient";

const NOTE_CATEGORY_PATTERNS: NoteCategoryPattern[] = [
  {
    category: "clinical_stability",
    signal_key: "clinical_status",
    blocker_patterns: [
      /desaturat/i,
      /dyspnea/i,
      /tachycard/i,
      /hypotens/i,
      /unstable/i,
      /oxygen requirement (?:remains|increased|still)/i,
    ],
    support_patterns: [/stable for discharge/i, /vitals stable/i, /back to baseline/i],
  },
  {
    category: "pending_diagnostics",
    signal_key: "diagnostics_status",
    blocker_patterns: [
      /pending (?:culture|lab|labs|imaging|test|result)/i,
      /awaiting (?:culture|lab|labs|imaging|test|result)/i,
      /diagnostic.*pending/i,
    ],
    support_patterns: [/diagnostic.*reviewed/i, /no pending diagnostics/i],
  },
  {
    category: "medication_reconciliation",
    signal_key: "medication_reconciliation_status",
    blocker_patterns: [
      /medication reconciliation.*incomplete/i,
      /medication.*discrepanc/i,
      /discharge med(?:ication)? list.*mismatch/i,
      /restart timing.*missing/i,
      /active inpatient.*still listed/i,
      /medication plan.*unresolved/i,
    ],
    support_patterns: [
      /medication reconciliation complete/i,
      /final medication list reviewed/i,
      /medication plan finalized/i,
    ],
  },
  {
    category: "follow_up_and_referrals",
    signal_key: "follow_up_coordination_status",
    blocker_patterns: [
      /follow-?up.*not (?:scheduled|booked|confirmed)/i,
      /referral.*pending/i,
      /appointment.*pending/i,
      /scheduling call.*pending/i,
    ],
    support_patterns: [/follow-?up.*scheduled/i, /referral.*confirmed/i],
  },
  {
    category: "patient_education",
    signal_key: "teach_back_status",
    blocker_patterns: [
      /teach-?back.*incomplete/i,
      /cannot repeat/i,
      /warning signs?.*unclear/i,
      /education.*pending/i,
      /does not understand/i,
    ],
    support_patterns: [/teach-?back complete/i, /verbalized understanding/i],
  },
  {
    category: "home_support_and_services",
    signal_key: "home_support_status",
    blocker_patterns: [
      /caregiver.*unconfirmed/i,
      /home (?:health|services?).*pending/i,
      /services?.*not arranged/i,
      /support at home.*unclear/i,
    ],
    support_patterns: [/caregiver confirmed/i, /home services arranged/i],
  },
  {
    category: "equipment_and_transport",
    signal_key: "equipment_and_transport_status",
    blocker_patterns: [
      /oxygen delivery.*pending/i,
      /vendor.*not confirmed/i,
      /dme.*pending/i,
      /transport.*pending/i,
      /ride.*not confirmed/i,
      /pickup time.*not documented/i,
    ],
    support_patterns: [
      /equipment delivered/i,
      /vendor confirmed/i,
      /transport confirmed/i,
      /ride arranged/i,
    ],
  },
  {
    category: "administrative_and_documentation",
    signal_key: "documentation_status",
    blocker_patterns: [
      /sign-?off.*pending/i,
      /discharge summary.*pending/i,
      /paperwork.*incomplete/i,
      /after-visit.*pending/i,
    ],
    support_patterns: [
      /documentation complete/i,
      /after-visit summary signed/i,
      /discharge paperwork complete/i,
    ],
  },
];

const NOTE_SIGNAL_SOURCE_PREFERENCE: ReadonlyArray<EvidenceSignalState> = [
  "blocks_readiness",
  "ambiguous",
  "supports_readiness",
];

const CRITICAL_SERVICE_REQUEST_PATTERNS = [
  /imaging/i,
  /diagnostic/i,
  /culture/i,
  /lab/i,
  /test/i,
  /scan/i,
];
const REFERRAL_SERVICE_REQUEST_PATTERNS = [/follow-?up/i, /referral/i, /clinic/i];
const HOME_SUPPORT_SERVICE_REQUEST_PATTERNS = [/home health/i, /home nursing/i, /pt\/ot/i, /therapy/i];
const EQUIPMENT_SERVICE_REQUEST_PATTERNS = [
  /oxygen/i,
  /walker/i,
  /wheelchair/i,
  /durable medical equipment/i,
  /dme/i,
  /transport/i,
  /ride/i,
];

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const asArray = (value: unknown): unknown[] => {
  return Array.isArray(value) ? value : [];
};

const readString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

const decodeBase64Text = (value: unknown): string | null => {
  const raw = readString(value);
  if (!raw) {
    return null;
  }

  try {
    return Buffer.from(raw, "base64").toString("utf8").trim() || null;
  } catch {
    return null;
  }
};

const stripHtml = (value: string): string => {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
};

const normalizeWhitespace = (value: string): string => {
  return value.replace(/\s+/g, " ").trim();
};

const collectCodingText = (value: unknown): string[] => {
  if (!isRecord(value)) {
    return [];
  }

  const texts = [readString(value["text"])]
    .filter((candidate): candidate is string => Boolean(candidate));
  for (const coding of asArray(value["coding"])) {
    if (!isRecord(coding)) {
      continue;
    }

    const codingText = [readString(coding["display"]), readString(coding["code"])]
      .filter((candidate): candidate is string => Boolean(candidate));
    texts.push(...codingText);
  }

  return texts;
};

const collectHumanNames = (value: unknown): string[] => {
  return asArray(value)
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      const text = readString(entry["text"]);
      if (text) {
        return text;
      }

      const given = asArray(entry["given"])
        .map((token) => readString(token))
        .filter((candidate): candidate is string => Boolean(candidate));
      const family = readString(entry["family"]);
      return [...given, family].filter((candidate): candidate is string => Boolean(candidate)).join(" ").trim() || null;
    })
    .filter((candidate): candidate is string => Boolean(candidate));
};

const collectReferenceText = (value: unknown): string[] => {
  if (!isRecord(value)) {
    return [];
  }

  return [readString(value["display"]), readString(value["reference"])]
    .filter((candidate): candidate is string => Boolean(candidate));
};

const collectResourceNotes = (resource: FhirResourceLike): string[] => {
  return asArray(resource["note"])
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      return readString(entry["text"]);
    })
    .filter((candidate): candidate is string => Boolean(candidate));
};

const getResourceType = (resource: FhirResourceLike): string => {
  return readString(resource["resourceType"]) ?? "Resource";
};

const getResourceId = (resource: FhirResourceLike): string => {
  return readString(resource["id"]) ?? `${getResourceType(resource).toLowerCase()}-unknown`;
};

const collectResourceText = (resource: FhirResourceLike): string[] => {
  const textDiv = isRecord(resource["text"]) ? readString(resource["text"]["div"]) : null;
  const attachmentTexts = asArray(resource["content"])
    .flatMap((content) => {
      if (!isRecord(content) || !isRecord(content["attachment"])) {
        return [];
      }

      const attachment = content["attachment"];
      const decoded = decodeBase64Text(attachment["data"]);
      return [
        readString(attachment["title"]),
        readString(attachment["url"]),
        decoded,
      ].filter((candidate): candidate is string => Boolean(candidate));
    });

  return [
    readString(resource["description"]),
    ...collectCodingText(resource["type"]),
    ...collectCodingText(resource["category"]),
    ...collectCodingText(resource["code"]),
    ...collectReferenceText(resource["subject"]),
    ...collectReferenceText(resource["encounter"]),
    ...collectReferenceText(resource["requester"]),
    ...collectHumanNames(resource["name"]),
    ...collectResourceNotes(resource),
    textDiv ? stripHtml(textDiv) : null,
    ...attachmentTexts,
  ].filter((candidate): candidate is string => Boolean(candidate));
};

const summarizeText = (value: string): string => {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= 180) {
    return normalized;
  }

  return `${normalized.slice(0, 177)}...`;
};

const stringifyError = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

const extractBundleResources = (bundle: unknown): FhirResourceLike[] => {
  if (!isRecord(bundle)) {
    return [];
  }

  const typedBundle = bundle as FhirBundleLike;
  return asArray(typedBundle.entry)
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      const resource = entry["resource"];
      return isRecord(resource) ? resource : null;
    })
    .filter((resource): resource is FhirResourceLike => Boolean(resource));
};

const safeReadResource = async (
  req: Request,
  path: string,
  issues: string[],
): Promise<FhirResourceLike | null> => {
  try {
    const resource = await FhirClientInstance.read(req, path);
    return isRecord(resource) ? resource : null;
  } catch (error) {
    issues.push(`Unable to retrieve ${path} from live FHIR context: ${stringifyError(error)}`);
    return null;
  }
};

const safeSearchResources = async (
  req: Request,
  resourceType: string,
  searchParameters: string[],
  issues: string[],
): Promise<FhirResourceLike[]> => {
  try {
    const bundle = await FhirClientInstance.search(req, resourceType, searchParameters);
    return extractBundleResources(bundle);
  } catch (error) {
    issues.push(
      `Unable to retrieve ${resourceType} resources from live FHIR context: ${stringifyError(error)}`,
    );
    return [];
  }
};

const buildDefaultFetchContext = async (
  req: Request,
  patientId: string,
): Promise<RetrievedDischargeContext> => {
  const issues: string[] = [];

  const [patient, observations, medicationRequests, medicationStatements, serviceRequests, documentReferences] =
    await Promise.all([
      safeReadResource(req, `Patient/${patientId}`, issues),
      safeSearchResources(req, "Observation", [`patient=${patientId}`, "_count=50"], issues),
      safeSearchResources(req, "MedicationRequest", [`patient=${patientId}`, "_count=50"], issues),
      safeSearchResources(req, "MedicationStatement", [`patient=${patientId}`, "_count=50"], issues),
      safeSearchResources(req, "ServiceRequest", [`patient=${patientId}`, "_count=50"], issues),
      safeSearchResources(req, "DocumentReference", [`patient=${patientId}`, "_count=50"], issues),
    ]);

  return {
    patient_id: patientId,
    patient,
    observations,
    medication_requests: medicationRequests,
    medication_statements: medicationStatements,
    service_requests: serviceRequests,
    document_references: documentReferences,
    issues,
  };
};

const readObservationNumericValue = (resource: FhirResourceLike): number | null => {
  if (!isRecord(resource["valueQuantity"])) {
    return null;
  }

  const rawValue = resource["valueQuantity"]["value"];
  return typeof rawValue === "number" ? rawValue : null;
};

const resourceTextIncludes = (resource: FhirResourceLike, patterns: RegExp[]): boolean => {
  const haystack = collectResourceText(resource).join(" ");
  return patterns.some((pattern) => pattern.test(haystack));
};

const buildStructuredEvidence = (
  sourceId: string,
  sourceLabel: string,
  detail: string,
  category: BlockerCategory,
  assertion: EvidenceAssertion,
): EvidenceRecord => {
  return {
    id: sourceId,
    source_type: "structured",
    source_label: sourceLabel,
    detail: summarizeText(detail),
    category,
    assertion,
  };
};

const buildNoteEvidence = (
  sourceId: string,
  sourceType: "note" | "document",
  sourceLabel: string,
  detail: string,
  category: BlockerCategory,
  assertion: EvidenceAssertion,
): EvidenceRecord => {
  return {
    id: sourceId,
    source_type: sourceType,
    source_label: sourceLabel,
    detail: summarizeText(detail),
    category,
    assertion,
  };
};

const firstMatchingDetail = (details: string[], fallback: string): string => {
  return details[0] ?? fallback;
};

const getPatientLabel = (patient: FhirResourceLike | null, patientId: string): string => {
  if (!patient) {
    return `Patient/${patientId}`;
  }

  return collectHumanNames(patient["name"])[0] ?? `Patient/${patientId}`;
};

const buildClinicalStability = (
  observations: FhirResourceLike[],
  evidenceCatalog: EvidenceRecord[],
): ReadinessInput["clinical_stability"] => {
  const issues: string[] = [];
  const currentOxygenObservation = observations.find((resource) => {
    return resourceTextIncludes(resource, [/oxygen flow/i, /o2 flow/i, /oxygen requirement/i]) &&
      !resourceTextIncludes(resource, [/baseline/i, /home oxygen baseline/i]);
  });
  const baselineOxygenObservation = observations.find((resource) => {
    return resourceTextIncludes(resource, [/baseline oxygen/i, /home oxygen baseline/i]);
  });

  const currentOxygen = currentOxygenObservation ? readObservationNumericValue(currentOxygenObservation) ?? 0 : 0;
  const baselineOxygen = baselineOxygenObservation ? readObservationNumericValue(baselineOxygenObservation) ?? 0 : 0;

  const vitalChecks = [
    {
      label: "heart rate",
      resource: observations.find((resource) => resourceTextIncludes(resource, [/heart rate/i, /pulse/i])),
      isStable: (value: number) => value >= 50 && value <= 110,
    },
    {
      label: "respiratory rate",
      resource: observations.find((resource) => resourceTextIncludes(resource, [/respiratory rate/i])),
      isStable: (value: number) => value <= 24,
    },
    {
      label: "temperature",
      resource: observations.find((resource) => resourceTextIncludes(resource, [/temperature/i])),
      isStable: (value: number) => value <= 38.3,
    },
    {
      label: "systolic blood pressure",
      resource: observations.find((resource) => resourceTextIncludes(resource, [/systolic blood pressure/i])),
      isStable: (value: number) => value >= 90,
    },
    {
      label: "oxygen saturation",
      resource: observations.find((resource) => resourceTextIncludes(resource, [/oxygen saturation/i, /spo2/i])),
      isStable: (value: number) => value >= 90,
    },
  ];

  let observedVitalCount = 0;
  let allObservedVitalsStable = true;

  for (const check of vitalChecks) {
    const resource = check.resource;
    const value = resource ? readObservationNumericValue(resource) : null;
    if (!resource || value === null) {
      continue;
    }

    observedVitalCount += 1;
    const stable = check.isStable(value);
    allObservedVitalsStable = allObservedVitalsStable && stable;
    evidenceCatalog.push(
      buildStructuredEvidence(
        `${getResourceType(resource)}-${getResourceId(resource)}`,
        `${getResourceType(resource)}/${check.label}`,
        `${check.label} is ${value}${check.label === "temperature" ? " C" : check.label === "oxygen saturation" ? "%" : ""}.`,
        "clinical_stability",
        stable ? "supports_readiness" : "supports_blocker",
      ),
    );

    if (!stable) {
      issues.push(`${check.label} remains outside the discharge-ready range.`);
    }
  }

  if (currentOxygenObservation) {
    evidenceCatalog.push(
      buildStructuredEvidence(
        `${getResourceType(currentOxygenObservation)}-${getResourceId(currentOxygenObservation)}`,
        `${getResourceType(currentOxygenObservation)}/oxygen-flow-rate`,
        `Current oxygen requirement is ${currentOxygen} L/min.`,
        "clinical_stability",
        currentOxygen > baselineOxygen ? "supports_blocker" : "supports_readiness",
      ),
    );
  }

  if (baselineOxygenObservation) {
    evidenceCatalog.push(
      buildStructuredEvidence(
        `${getResourceType(baselineOxygenObservation)}-${getResourceId(baselineOxygenObservation)}`,
        `${getResourceType(baselineOxygenObservation)}/baseline-oxygen-flow-rate`,
        `Baseline oxygen requirement is ${baselineOxygen} L/min.`,
        "clinical_stability",
        "supports_readiness",
      ),
    );
  }

  if (observedVitalCount === 0) {
    issues.push("Current vital-sign observations were not available in live FHIR context.");
    evidenceCatalog.push(
      buildStructuredEvidence(
        "structured-clinical-stability-missing-vitals",
        "Structured/clinical_stability",
        "Live FHIR context did not include a current vital-sign set for discharge review.",
        "clinical_stability",
        "supports_blocker",
      ),
    );
  }

  const oxygenAboveBaseline = currentOxygen > baselineOxygen;
  if (oxygenAboveBaseline) {
    issues.push(`Current oxygen requirement remains above baseline (${currentOxygen} L/min vs ${baselineOxygen} L/min).`);
  }

  return {
    vitals_stable: observedVitalCount > 0 && allObservedVitalsStable,
    oxygen_lpm: currentOxygen,
    baseline_oxygen_lpm: baselineOxygen,
  };
};

const buildPendingDiagnostics = (
  serviceRequests: FhirResourceLike[],
  evidenceCatalog: EvidenceRecord[],
): ReadinessInput["pending_diagnostics"] => {
  const pendingItems = serviceRequests
    .filter((resource) => {
      return resourceTextIncludes(resource, CRITICAL_SERVICE_REQUEST_PATTERNS) &&
        !resourceTextIncludes(resource, [/completed/i, /cancelled/i, /revoked/i]);
    })
    .map((resource) => {
      const label = collectResourceText(resource).join(" ");
      const detail = firstMatchingDetail(
        collectResourceNotes(resource),
        collectCodingText(resource["code"])[0] ?? summarizeText(label),
      );
      evidenceCatalog.push(
        buildStructuredEvidence(
          `${getResourceType(resource)}-${getResourceId(resource)}`,
          `${getResourceType(resource)}/pending-diagnostic`,
          detail,
          "pending_diagnostics",
          "supports_blocker",
        ),
      );
      return summarizeText(detail);
    });

  if (pendingItems.length === 0) {
    evidenceCatalog.push(
      buildStructuredEvidence(
        "structured-pending-diagnostics-clear",
        "Structured/pending_diagnostics",
        "No open discharge-critical diagnostic requests were found in the live FHIR context.",
        "pending_diagnostics",
        "supports_readiness",
      ),
    );
  }

  return {
    critical_results_pending: pendingItems.length > 0,
    pending_items: pendingItems,
  };
};

const buildMedicationReconciliation = (
  medicationRequests: FhirResourceLike[],
  medicationStatements: FhirResourceLike[],
  evidenceCatalog: EvidenceRecord[],
): ReadinessInput["medication_reconciliation"] => {
  const unresolvedIssues: string[] = [];
  const allMedicationResources = [...medicationRequests, ...medicationStatements];

  if (allMedicationResources.length === 0) {
    unresolvedIssues.push(
      "Live FHIR context did not include MedicationRequest or MedicationStatement resources to confirm discharge reconciliation.",
    );
    evidenceCatalog.push(
      buildStructuredEvidence(
        "structured-medication-reconciliation-missing",
        "Structured/medication_reconciliation",
        firstMatchingDetail(
          unresolvedIssues,
          "Live FHIR context did not include medication resources to confirm reconciliation.",
        ),
        "medication_reconciliation",
        "supports_blocker",
      ),
    );
  }

  for (const resource of allMedicationResources) {
    const resourceSummary = collectResourceText(resource).join(" ");
    const detail = summarizeText(resourceSummary || `${getResourceType(resource)} ${getResourceId(resource)}`);
    const unresolved = /discrepanc|unresolved|pending|restart timing|still listed|hold/i.test(resourceSummary);
    evidenceCatalog.push(
      buildStructuredEvidence(
        `${getResourceType(resource)}-${getResourceId(resource)}`,
        `${getResourceType(resource)}/medication-context`,
        detail,
        "medication_reconciliation",
        unresolved ? "supports_blocker" : "supports_readiness",
      ),
    );

    if (unresolved) {
      unresolvedIssues.push(detail);
    }
  }

  return {
    reconciliation_complete: unresolvedIssues.length === 0 && allMedicationResources.length > 0,
    unresolved_issues: [...new Set(unresolvedIssues)],
  };
};

const buildFollowUpAndReferrals = (
  serviceRequests: FhirResourceLike[],
  evidenceCatalog: EvidenceRecord[],
): ReadinessInput["follow_up_and_referrals"] => {
  const missingReferrals = serviceRequests
    .filter((resource) => {
      return resourceTextIncludes(resource, REFERRAL_SERVICE_REQUEST_PATTERNS) &&
        !resourceTextIncludes(resource, [/completed/i, /scheduled/i, /fulfilled/i]);
    })
    .map((resource) => {
      const detail = summarizeText(collectResourceText(resource).join(" "));
      evidenceCatalog.push(
        buildStructuredEvidence(
          `${getResourceType(resource)}-${getResourceId(resource)}`,
          `${getResourceType(resource)}/follow-up-or-referral`,
          detail,
          "follow_up_and_referrals",
          "supports_blocker",
        ),
      );
      return detail;
    });

  if (missingReferrals.length === 0) {
    evidenceCatalog.push(
      buildStructuredEvidence(
        "structured-follow-up-clear",
        "Structured/follow_up_and_referrals",
        "No open follow-up or referral coordination gaps were found in live structured context.",
        "follow_up_and_referrals",
        "supports_readiness",
      ),
    );
  }

  return {
    appointments_scheduled: missingReferrals.length === 0,
    missing_referrals: [...new Set(missingReferrals)],
  };
};

const buildDocumentLabel = (resource: FhirResourceLike): string => {
  const pieces = [
    readString(resource["description"]),
    ...collectCodingText(resource["type"]),
    ...collectCodingText(resource["category"]),
  ].filter((candidate): candidate is string => Boolean(candidate));

  return pieces[0] ?? `${getResourceType(resource)}/${getResourceId(resource)}`;
};

const buildDocumentText = (resource: FhirResourceLike): string => {
  return normalizeWhitespace(collectResourceText(resource).join(" "));
};

const detectNoteSignals = (text: string): DerivedNoteSignal[] => {
  const signals: DerivedNoteSignal[] = [];

  for (const pattern of NOTE_CATEGORY_PATTERNS) {
    const hasBlocker = pattern.blocker_patterns.some((candidate) => candidate.test(text));
    const hasSupport = pattern.support_patterns.some((candidate) => candidate.test(text));

    if (!hasBlocker && !hasSupport) {
      continue;
    }

    const state: EvidenceSignalState = hasBlocker && hasSupport
      ? "ambiguous"
      : hasBlocker
        ? "blocks_readiness"
        : "supports_readiness";
    const assertion: EvidenceAssertion = state === "blocks_readiness"
      ? "supports_blocker"
      : state === "supports_readiness"
        ? "supports_readiness"
        : "uncertain";

    signals.push({
      category: pattern.category,
      signal_key: pattern.signal_key,
      state,
      detail: summarizeText(text),
      assertion,
    });
  }

  return signals;
};

const buildNoteDocumentInputs = (
  documentReferences: FhirResourceLike[],
  evidenceCatalog: EvidenceRecord[],
): NoteDocumentInput[] => {
  const documents: NoteDocumentInput[] = [];

  for (const resource of documentReferences) {
    const sourceType = getResourceType(resource) === "DocumentReference" ? "document" : "note";
    const sourceLabel = buildDocumentLabel(resource);
    const text = buildDocumentText(resource);
    if (!text) {
      continue;
    }

    const signals = detectNoteSignals(text)
      .sort((a, b) => {
        const categoryDelta = a.category.localeCompare(b.category);
        if (categoryDelta !== 0) {
          return categoryDelta;
        }

        return NOTE_SIGNAL_SOURCE_PREFERENCE.indexOf(a.state) - NOTE_SIGNAL_SOURCE_PREFERENCE.indexOf(b.state);
      })
      .map((signal, index) => {
        const evidenceId = `${sourceType}-${getResourceId(resource)}-${signal.category}`;
        evidenceCatalog.push(
          buildNoteEvidence(
            evidenceId,
            sourceType,
            sourceLabel,
            signal.detail,
            signal.category,
            signal.assertion,
          ),
        );
        return {
          id: `${signal.category}-${index + 1}`,
          category: signal.category,
          signal_key: signal.signal_key,
          state: signal.state,
          detail: signal.detail,
          source_evidence_id: evidenceId,
        };
      });

    if (signals.length === 0) {
      continue;
    }

    documents.push({
      id: getResourceId(resource),
      source_type: sourceType,
      source_label: sourceLabel,
      signals,
    });
  }

  return documents;
};

const summarizeNoteEvidence = (
  noteDocuments: NoteDocumentInput[],
): Map<BlockerCategory, NoteEvidenceSummary> => {
  const summary = new Map<BlockerCategory, NoteEvidenceSummary>();

  for (const document of noteDocuments) {
    for (const signal of document.signals) {
      const current = summary.get(signal.category) ?? {
        has_blocking: false,
        has_supporting: false,
        has_ambiguous: false,
        blocking_details: [],
        supporting_details: [],
        ambiguous_details: [],
      };

      if (signal.state === "blocks_readiness") {
        current.has_blocking = true;
        current.blocking_details.push(signal.detail);
      } else if (signal.state === "supports_readiness") {
        current.has_supporting = true;
        current.supporting_details.push(signal.detail);
      } else {
        current.has_ambiguous = true;
        current.ambiguous_details.push(signal.detail);
      }

      summary.set(signal.category, current);
    }
  }

  return summary;
};

const resolveNoteDrivenState = (
  summary: NoteEvidenceSummary | undefined,
  missingMessage: string,
): { complete: boolean; gaps: string[] } => {
  if (!summary) {
    return { complete: false, gaps: [missingMessage] };
  }

  if (summary.has_blocking || summary.has_ambiguous) {
    return {
      complete: false,
      gaps: [
        ...summary.blocking_details,
        ...summary.ambiguous_details,
      ],
    };
  }

  if (summary.has_supporting) {
    return { complete: true, gaps: [] };
  }

  return { complete: false, gaps: [missingMessage] };
};

const hasBlockingServiceRequest = (
  serviceRequests: FhirResourceLike[],
  patterns: RegExp[],
): boolean => {
  return serviceRequests.some((resource) => {
    return resourceTextIncludes(resource, patterns) &&
      !resourceTextIncludes(resource, [/completed/i, /confirmed/i, /fulfilled/i, /delivered/i]);
  });
};

const listServiceRequestDetails = (
  serviceRequests: FhirResourceLike[],
  patterns: RegExp[],
): string[] => {
  return serviceRequests
    .filter((resource) => {
      return resourceTextIncludes(resource, patterns) &&
        !resourceTextIncludes(resource, [/completed/i, /confirmed/i, /fulfilled/i, /delivered/i]);
    })
    .map((resource) => summarizeText(collectResourceText(resource).join(" ")));
};

const buildHomeSupportAndServices = (
  serviceRequests: FhirResourceLike[],
  noteSummary: Map<BlockerCategory, NoteEvidenceSummary>,
  evidenceCatalog: EvidenceRecord[],
): ReadinessInput["home_support_and_services"] => {
  const noteState = resolveNoteDrivenState(
    noteSummary.get("home_support_and_services"),
    "No case-management or home-services note was available to confirm caregiver coverage and home-service setup.",
  );

  const structuredIssues = listServiceRequestDetails(serviceRequests, HOME_SUPPORT_SERVICE_REQUEST_PATTERNS);
  for (const [index, detail] of structuredIssues.entries()) {
    evidenceCatalog.push(
      buildStructuredEvidence(
        `structured-home-support-${index + 1}`,
        "Structured/home_support_and_services",
        detail,
        "home_support_and_services",
        "supports_blocker",
      ),
    );
  }

  return {
    caregiver_confirmed: noteState.complete,
    services_confirmed: noteState.complete && structuredIssues.length === 0,
    documented_gaps: [...noteState.gaps, ...structuredIssues],
  };
};

const buildEquipmentAndTransport = (
  serviceRequests: FhirResourceLike[],
  noteSummary: Map<BlockerCategory, NoteEvidenceSummary>,
  evidenceCatalog: EvidenceRecord[],
): ReadinessInput["equipment_and_transport"] => {
  const noteState = resolveNoteDrivenState(
    noteSummary.get("equipment_and_transport"),
    "No durable medical equipment or transport note was available to confirm discharge logistics.",
  );

  const structuredIssues = listServiceRequestDetails(serviceRequests, EQUIPMENT_SERVICE_REQUEST_PATTERNS);
  for (const [index, detail] of structuredIssues.entries()) {
    evidenceCatalog.push(
      buildStructuredEvidence(
        `structured-equipment-transport-${index + 1}`,
        "Structured/equipment_and_transport",
        detail,
        "equipment_and_transport",
        "supports_blocker",
      ),
    );
  }

  return {
    transport_confirmed: !hasBlockingServiceRequest(serviceRequests, [/transport/i, /ride/i]) && !noteState.gaps.some((detail) => /transport|ride|pickup/i.test(detail)),
    equipment_ready: !hasBlockingServiceRequest(serviceRequests, [/oxygen/i, /dme/i, /equipment/i]) && !noteState.gaps.some((detail) => /oxygen|dme|equipment|vendor/i.test(detail)),
    documented_gaps: [...noteState.gaps, ...structuredIssues],
  };
};

const buildPatientEducation = (
  noteSummary: Map<BlockerCategory, NoteEvidenceSummary>,
): ReadinessInput["patient_education"] => {
  const noteState = resolveNoteDrivenState(
    noteSummary.get("patient_education"),
    "No discharge education note was available to confirm completed teach-back and warning-sign review.",
  );

  return {
    teach_back_complete: noteState.complete,
    documented_gaps: noteState.gaps,
  };
};

const buildAdministrativeAndDocumentation = (
  noteSummary: Map<BlockerCategory, NoteEvidenceSummary>,
): ReadinessInput["administrative_and_documentation"] => {
  const noteState = resolveNoteDrivenState(
    noteSummary.get("administrative_and_documentation"),
    "No finalized discharge documentation note or document was available to confirm sign-off completion.",
  );

  return {
    discharge_documents_complete: noteState.complete,
    documented_gaps: noteState.gaps,
  };
};

const buildLiveContextReadinessInput = (
  snapshot: RetrievedDischargeContext,
): ReadinessInput => {
  const evidenceCatalog: EvidenceRecord[] = [];
  const noteDocuments = buildNoteDocumentInputs(snapshot.document_references, evidenceCatalog);
  const noteSummary = summarizeNoteEvidence(noteDocuments);

  const clinicalStability = buildClinicalStability(snapshot.observations, evidenceCatalog);
  const pendingDiagnostics = buildPendingDiagnostics(snapshot.service_requests, evidenceCatalog);
  const medicationReconciliation = buildMedicationReconciliation(
    snapshot.medication_requests,
    snapshot.medication_statements,
    evidenceCatalog,
  );
  const followUpAndReferrals = buildFollowUpAndReferrals(snapshot.service_requests, evidenceCatalog);
  const patientEducation = buildPatientEducation(noteSummary);
  const homeSupportAndServices = buildHomeSupportAndServices(
    snapshot.service_requests,
    noteSummary,
    evidenceCatalog,
  );
  const equipmentAndTransport = buildEquipmentAndTransport(
    snapshot.service_requests,
    noteSummary,
    evidenceCatalog,
  );
  const administrativeAndDocumentation = buildAdministrativeAndDocumentation(noteSummary);

  if (snapshot.issues.length > 0) {
    evidenceCatalog.push(
      buildStructuredEvidence(
        "structured-live-context-issues",
        "Structured/live_context",
        snapshot.issues.join(" "),
        "administrative_and_documentation",
        "uncertain",
      ),
    );
  }

  return {
    scenario_id: `${LIVE_CONTEXT_SCENARIO_PREFIX}_${snapshot.patient_id}`,
    clinical_stability: clinicalStability,
    pending_diagnostics: pendingDiagnostics,
    medication_reconciliation: medicationReconciliation,
    follow_up_and_referrals: followUpAndReferrals,
    patient_education: patientEducation,
    home_support_and_services: homeSupportAndServices,
    equipment_and_transport: equipmentAndTransport,
    administrative_and_documentation: administrativeAndDocumentation,
    evidence_catalog: evidenceCatalog,
    note_documents: noteDocuments,
  };
};

const buildFallbackResolution = (
  scenarioId: string | undefined,
  issues: string[],
): WorkflowInputResolution => {
  return {
    input: resolveScenarioInput(scenarioId),
    source: "synthetic_fallback",
    context_status: issues.length > 0 ? "missing" : "complete",
    issues,
    fallback_used: true,
    patient_id: null,
  };
};

export const resolveWorkflowInputForRequest = async (
  req: Request,
  options: ResolveWorkflowInputOptions = {},
): Promise<WorkflowInputResolution> => {
  if (options.scenarioId) {
    return {
      input: resolveScenarioInput(options.scenarioId),
      source: "synthetic_fallback",
      context_status: "complete",
      issues: [],
      fallback_used: false,
      patient_id: null,
    };
  }

  const allowSyntheticFallback = options.allowSyntheticFallback ?? DEFAULT_ALLOW_SYNTHETIC_FALLBACK;
  const fhirContext = FhirUtilities.getFhirContext(req);
  const patientId = FhirUtilities.getPatientIdIfContextExists(req);

  if (!fhirContext || !patientId) {
    const issues: string[] = [];
    if (!fhirContext) {
      issues.push("Prompt Opinion FHIR context headers were not present on the request.");
    }
    if (!patientId) {
      issues.push("Prompt Opinion patient identifier could not be recovered from the request context.");
    }

    if (!allowSyntheticFallback) {
      throw new Error(issues.join(" "));
    }

    return buildFallbackResolution(undefined, issues);
  }

  const fetchContext = options.fetchContext ?? buildDefaultFetchContext;

  try {
    const snapshot = await fetchContext(req, patientId);
    const patientLabel = getPatientLabel(snapshot.patient, patientId);
    const input = buildLiveContextReadinessInput(snapshot);
    input.evidence_catalog.unshift(
      buildStructuredEvidence(
        `patient-${patientId}`,
        "Patient/context",
        `Live discharge context resolved for ${patientLabel}.`,
        "administrative_and_documentation",
        snapshot.issues.length > 0 ? "uncertain" : "supports_readiness",
      ),
    );

    return {
      input,
      source: "live_fhir",
      context_status: snapshot.issues.length > 0 ? "partial" : "complete",
      issues: snapshot.issues,
      fallback_used: false,
      patient_id: patientId,
    };
  } catch (error) {
    const issues = [`Live FHIR context retrieval failed: ${stringifyError(error)}`];
    if (!allowSyntheticFallback) {
      throw new Error(issues[0]);
    }

    return buildFallbackResolution(undefined, issues);
  }
};
