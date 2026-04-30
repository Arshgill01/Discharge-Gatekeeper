import {
  DeterministicBlocker,
  HiddenRiskFinding,
  HiddenRiskInput,
  HiddenRiskOutput,
  hiddenRiskInputSchema,
  hiddenRiskOutputSchema,
} from "./contract";
import { getHiddenRiskLlmClient, HiddenRiskLlmClient } from "../llm/client";

type SurfaceHiddenRiskResult = {
  payload: HiddenRiskOutput;
  provider: string;
};

export const HIDDEN_RISK_RESPONSE_MODES = ["full", "prompt_opinion_slim"] as const;
export type HiddenRiskResponseMode = (typeof HIDDEN_RISK_RESPONSE_MODES)[number];

export type SurfaceHiddenRiskOptions = {
  llmClientOverride?: HiddenRiskLlmClient;
  responseMode?: HiddenRiskResponseMode;
};

export const parseJsonObject = (text: string): unknown => {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) {
      throw new Error("Could not locate a JSON object in model output.");
    }
    return JSON.parse(trimmed.slice(start, end + 1));
  }
};

const normalizeCitationMap = (
  citations: HiddenRiskOutput["citations"],
): Map<string, HiddenRiskOutput["citations"][number]> => {
  return new Map(citations.map((citation) => [citation.citation_id, citation]));
};

const formatCitationAnchor = (
  citation: HiddenRiskOutput["citations"][number],
): string => {
  return `${citation.source_label}${citation.locator ? ` (${citation.locator})` : ""} [${citation.citation_id}]`;
};

const getFindingCitationAnchors = (
  finding: HiddenRiskFinding,
  citationMap: Map<string, HiddenRiskOutput["citations"][number]>,
  limit = 2,
): string[] => {
  return [...new Set(
    finding.citation_ids
      .map((citationId) => citationMap.get(citationId))
      .filter((citation): citation is HiddenRiskOutput["citations"][number] => Boolean(citation))
      .map((citation) => formatCitationAnchor(citation)),
  )].slice(0, limit);
};

const tokenizeMeaningful = (value: string): string[] => {
  const stopWords = new Set([
    "with",
    "from",
    "that",
    "this",
    "were",
    "have",
    "into",
    "they",
    "their",
    "home",
    "note",
    "risk",
    "plan",
    "after",
    "before",
    "patient",
    "discharge",
  ]);

  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !stopWords.has(token));
};

const countTokenOverlap = (a: string, b: string): number => {
  const aTokens = new Set(tokenizeMeaningful(a));
  const bTokens = tokenizeMeaningful(b);
  let overlap = 0;
  for (const token of bTokens) {
    if (aTokens.has(token)) {
      overlap += 1;
    }
  }
  return overlap;
};

const sharesMeaningfulTokens = (a: string, b: string): boolean => {
  return countTokenOverlap(a, b) >= 3;
};

const categoryKeywordMap: Record<HiddenRiskFinding["category"], string[]> = {
  clinical_stability: ["oxygen", "desaturation", "dyspnea", "ambulation", "stairs", "hypoxia"],
  pending_diagnostics: ["pending", "result", "diagnostic", "imaging", "lab"],
  medication_reconciliation: ["medication", "reconciliation", "dose", "prescription"],
  follow_up_and_referrals: ["follow", "referral", "appointment", "clinic"],
  patient_education: ["education", "teach", "understanding", "instruction"],
  home_support_and_services: ["caregiver", "support", "alone", "overnight", "services"],
  equipment_and_transport: ["oxygen", "equipment", "delivery", "transport", "concentrator"],
  administrative_and_documentation: ["documentation", "paperwork", "handoff", "summary"],
};

const hasCategoryKeywordOverlap = (
  category: HiddenRiskFinding["category"],
  blockerDescription: string,
  findingText: string,
): boolean => {
  const keywords = categoryKeywordMap[category];
  const blockerLower = blockerDescription.toLowerCase();
  const findingLower = findingText.toLowerCase();
  const overlap = keywords.filter(
    (keyword) => blockerLower.includes(keyword) && findingLower.includes(keyword),
  );
  return overlap.length >= 2;
};

const buildFindingContextText = (
  finding: HiddenRiskFinding,
  citationMap: Map<string, HiddenRiskOutput["citations"][number]>,
): string => {
  const citationText = finding.citation_ids
    .map((citationId) => citationMap.get(citationId)?.excerpt || "")
    .join(" ");
  return `${finding.title} ${finding.rationale} ${citationText}`.trim();
};

const findDuplicateBlocker = (
  finding: HiddenRiskFinding,
  deterministicBlockers: DeterministicBlocker[],
  citationMap: Map<string, HiddenRiskOutput["citations"][number]>,
): DeterministicBlocker | null => {
  const findingText = buildFindingContextText(finding, citationMap);
  for (const blocker of deterministicBlockers) {
    if (finding.is_duplicate_of_blocker_id && finding.is_duplicate_of_blocker_id === blocker.blocker_id) {
      return blocker;
    }
    if (blocker.category !== finding.category) {
      continue;
    }
    if (sharesMeaningfulTokens(blocker.description, findingText)) {
      return blocker;
    }
    if (hasCategoryKeywordOverlap(finding.category, blocker.description, findingText)) {
      return blocker;
    }
  }
  return null;
};

type CategorySignals = Record<
  HiddenRiskFinding["category"],
  {
    risk: number;
    reassuring: number;
  }
>;

const categorySignalPatterns: Record<
  HiddenRiskFinding["category"],
  {
    risk: RegExp[];
    reassuring: RegExp[];
  }
> = {
  clinical_stability: {
    risk: [/desaturat/i, /dropped to/i, /dyspne/i, /hypoxi/i, /worsen/i],
    reassuring: [/stable/i, /without desaturat/i, /no desaturat/i, /no dyspne/i, /remained above/i],
  },
  pending_diagnostics: {
    risk: [/pending/i, /awaiting/i, /not resulted/i],
    reassuring: [/final result/i, /completed/i, /no pending/i],
  },
  medication_reconciliation: {
    risk: [/medication/i, /reconciliation gap/i, /not reconciled/i],
    reassuring: [/reconciled/i, /medication list complete/i],
  },
  follow_up_and_referrals: {
    risk: [/follow[- ]?up missing/i, /referral missing/i, /not scheduled/i],
    reassuring: [/follow[- ]?up.*scheduled/i, /appointment confirmed/i],
  },
  patient_education: {
    risk: [/teach[- ]?back incomplete/i, /does not understand/i, /education gap/i],
    reassuring: [/teach[- ]?back complete/i, /understands instructions/i],
  },
  home_support_and_services: {
    risk: [/lives alone/i, /cannot stay/i, /unavailable overnight/i, /no caregiver/i],
    reassuring: [/caregiver confirmed/i, /daughter available/i, /overnight support/i],
  },
  equipment_and_transport: {
    risk: [/cannot deliver/i, /delivery delayed/i, /no oxygen at home/i, /transport not arranged/i],
    reassuring: [/equipment confirmed/i, /oxygen delivery confirmed/i, /transport arranged/i],
  },
  administrative_and_documentation: {
    risk: [/documentation incomplete/i, /handoff missing/i],
    reassuring: [/documentation complete/i, /handoff complete/i],
  },
};

const buildCategorySignals = (input: HiddenRiskInput): CategorySignals => {
  const signals: CategorySignals = {
    clinical_stability: { risk: 0, reassuring: 0 },
    pending_diagnostics: { risk: 0, reassuring: 0 },
    medication_reconciliation: { risk: 0, reassuring: 0 },
    follow_up_and_referrals: { risk: 0, reassuring: 0 },
    patient_education: { risk: 0, reassuring: 0 },
    home_support_and_services: { risk: 0, reassuring: 0 },
    equipment_and_transport: { risk: 0, reassuring: 0 },
    administrative_and_documentation: { risk: 0, reassuring: 0 },
  };

  for (const source of input.narrative_evidence_bundle) {
    const excerpt = source.excerpt;
    for (const category of Object.keys(categorySignalPatterns) as HiddenRiskFinding["category"][]) {
      const patterns = categorySignalPatterns[category];
      if (patterns.risk.some((pattern) => pattern.test(excerpt))) {
        signals[category].risk += 1;
      }
      if (patterns.reassuring.some((pattern) => pattern.test(excerpt))) {
        signals[category].reassuring += 1;
      }
    }
  }
  return signals;
};

const hasCriticalEvidence = (
  finding: HiddenRiskFinding,
  citationIds: string[],
  citationMap: Map<string, HiddenRiskOutput["citations"][number]>,
): boolean => {
  const criticalPattern =
    /dropped to\s*\d{2}%|desaturat|dyspne|cannot deliver|delivery delayed|no oxygen at home|cannot stay|no caregiver|discharge hold|unsafe/i;
  const evidenceText = `${finding.title} ${finding.rationale} ${citationIds
    .map((citationId) => citationMap.get(citationId)?.excerpt || "")
    .join(" ")}`;
  return criticalPattern.test(evidenceText);
};

const hasCategoryContradiction = (
  finding: HiddenRiskFinding,
  signals: CategorySignals,
): boolean => {
  const categorySignals = signals[finding.category];
  return categorySignals.risk > 0 && categorySignals.reassuring > 0;
};

const buildEvidenceLinkedSummary = (
  baselineVerdict: HiddenRiskInput["deterministic_snapshot"]["baseline_verdict"],
  findings: HiddenRiskOutput["hidden_risk_findings"],
  citations: HiddenRiskOutput["citations"],
): string => {
  if (findings.length === 0) {
    return `Structured baseline remains ${baselineVerdict}. Narrative review did not find a new discharge-changing contradiction or note-only blocker.`;
  }

  const citationMap = normalizeCitationMap(citations);
  const contradictionClauses = findings.slice(0, 3).map((finding) => {
    const anchors = getFindingCitationAnchors(finding, citationMap).join("; ");
    return `${finding.category}: ${finding.title}${anchors ? ` via ${anchors}` : ""}`;
  });

  return `Structured baseline was ${baselineVerdict}, but narrative evidence contradicted that posture: ${contradictionClauses.join(" | ")}.`;
};

const buildNoHiddenRiskSummary = (
  input: HiddenRiskInput,
): string => {
  return `Structured baseline remains ${input.deterministic_snapshot.baseline_verdict}. Reviewed ${input.narrative_evidence_bundle.length} narrative source(s) and found no additional discharge-changing contradiction or note-only blocker.`;
};

const buildInconclusiveSummary = (
  input: HiddenRiskInput,
  findings: HiddenRiskOutput["hidden_risk_findings"],
  citations: HiddenRiskOutput["citations"],
): string => {
  const citationMap = normalizeCitationMap(citations);
  const anchors = [...new Set(
    findings.flatMap((finding) => getFindingCitationAnchors(finding, citationMap, 1)),
  )].slice(0, 2);

  const anchorSuffix = anchors.length > 0 ? ` Reviewed anchors: ${anchors.join("; ")}.` : "";
  return `Structured baseline was ${input.deterministic_snapshot.baseline_verdict}, but the available narrative evidence could not support a discharge-changing hidden-risk escalation with enough confidence. Keep the posture bounded and require manual review before discharge.${anchorSuffix}`;
};

const determineSummaryConfidence = (
  findings: HiddenRiskOutput["hidden_risk_findings"],
): HiddenRiskOutput["hidden_risk_summary"]["confidence"] => {
  if (findings.length === 0) {
    return "medium";
  }

  if (findings.every((finding) => finding.confidence === "high")) {
    return "high";
  }

  if (findings.some((finding) => finding.confidence === "medium" || finding.confidence === "high")) {
    return "medium";
  }

  return "low";
};

const truncateText = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
};

const buildBasePayload = (
  input: HiddenRiskInput,
  overrides: Partial<HiddenRiskOutput>,
): HiddenRiskOutput => {
  const base: HiddenRiskOutput = {
    contract_version: "phase0_hidden_risk_v1",
    status: "ok",
    patient_id: input.deterministic_snapshot.patient_id ?? null,
    encounter_id: input.deterministic_snapshot.encounter_id ?? null,
    baseline_verdict: input.deterministic_snapshot.baseline_verdict,
    hidden_risk_summary: {
      result: "no_hidden_risk",
      overall_disposition_impact: "none",
      confidence: "medium",
      summary: "No hidden risk found.",
      manual_review_required: false,
      false_positive_guardrail:
        "No findings are emitted without cited narrative evidence with discharge relevance.",
    },
    hidden_risk_findings: [],
    citations: [],
    review_metadata: {
      narrative_sources_reviewed: input.narrative_evidence_bundle.length,
      duplicate_findings_suppressed: 0,
      weak_findings_suppressed: 0,
    },
  };

  return {
    ...base,
    ...overrides,
    hidden_risk_summary: {
      ...base.hidden_risk_summary,
      ...(overrides.hidden_risk_summary || {}),
    },
    review_metadata: {
      ...base.review_metadata,
      ...(overrides.review_metadata || {}),
    },
  };
};

const buildInsufficientContextPayload = (input: HiddenRiskInput): HiddenRiskOutput => {
  return buildBasePayload(input, {
    status: "insufficient_context",
    hidden_risk_summary: {
      result: "inconclusive",
      overall_disposition_impact: "uncertain",
      confidence: "low",
      summary:
        `Structured baseline is ${input.deterministic_snapshot.baseline_verdict}, but hidden-risk review cannot run because the narrative evidence bundle is missing or empty. Manual review is required before discharge.`,
      manual_review_required: true,
      false_positive_guardrail:
        "No hidden-risk findings emitted because required narrative evidence was not provided.",
    },
  });
};

const buildErrorPayload = (input: HiddenRiskInput, reason: string): HiddenRiskOutput => {
  return buildBasePayload(input, {
    status: "error",
    hidden_risk_summary: {
      result: "inconclusive",
      overall_disposition_impact: "uncertain",
      confidence: "low",
      summary: `clinical_intelligence_unavailable: ${reason}`,
      manual_review_required: true,
      false_positive_guardrail:
        "No hidden-risk escalation is emitted when model output is unavailable, timed out, or unparseable.",
    },
  });
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

const asBoolean = (value: unknown): boolean | null => {
  return typeof value === "boolean" ? value : null;
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => asString(item))
    .filter((item): item is string => Boolean(item));
};

const normalizeDispositionImpact = (value: unknown): HiddenRiskOutput["hidden_risk_summary"]["overall_disposition_impact"] => {
  const normalized = asString(value)?.toLowerCase();
  if (normalized === "none" || normalized === "caveat" || normalized === "not_ready" || normalized === "uncertain") {
    return normalized;
  }
  if (normalized === "ready" || normalized === "safe") {
    return "none";
  }
  if (normalized === "review" || normalized === "review_required") {
    return "uncertain";
  }
  return "uncertain";
};

const normalizeConfidence = (
  value: unknown,
  fallback: HiddenRiskOutput["hidden_risk_summary"]["confidence"],
): HiddenRiskOutput["hidden_risk_summary"]["confidence"] => {
  const normalized = asString(value)?.toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high") {
    return normalized;
  }
  return fallback;
};

const inferResultFromRaw = (
  raw: Record<string, unknown>,
  findings: Record<string, unknown>[],
): HiddenRiskOutput["hidden_risk_summary"]["result"] => {
  const hiddenRiskPresent = asBoolean(raw["hidden_risk_present"]);
  if (hiddenRiskPresent === true) {
    return "hidden_risk_present";
  }
  if (hiddenRiskPresent === false) {
    return "no_hidden_risk";
  }
  const summary = asRecord(raw["hidden_risk_summary"]);
  const summaryResult = asString(summary?.["result"])?.toLowerCase();
  if (summaryResult === "hidden_risk_present" || summaryResult === "no_hidden_risk" || summaryResult === "inconclusive") {
    return summaryResult;
  }
  return findings.length > 0 ? "hidden_risk_present" : "inconclusive";
};

const inferFindingCategories = (
  text: string,
): HiddenRiskFinding["category"][] => {
  const lowered = text.toLowerCase();
  const scored = (Object.keys(categoryKeywordMap) as HiddenRiskFinding["category"][])
    .map((category) => ({
      category,
      score: categoryKeywordMap[category].filter((keyword) => lowered.includes(keyword)).length,
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return ["clinical_stability"];
  }

  const maxScore = scored[0]?.score ?? 0;
  const categories = scored
    .filter((entry) => entry.score >= 2 || entry.score === maxScore)
    .map((entry) => entry.category)
    .slice(0, 3);

  if (
    !categories.includes("home_support_and_services") &&
    /\b(caregiver|overnight|lives alone|alone|daughter cannot stay|no alternate caregiver)\b/i.test(lowered)
  ) {
    categories.push("home_support_and_services");
  }

  if (
    !categories.includes("equipment_and_transport") &&
    /\b(oxygen|concentrator|equipment|delivery delayed|cannot deliver|transport)\b/i.test(lowered)
  ) {
    categories.push("equipment_and_transport");
  }

  return categories.slice(0, 3);
};

const normalizeAction = (
  value: unknown,
  dispositionImpact: HiddenRiskFinding["disposition_impact"],
  manualReviewRequired: boolean,
): HiddenRiskFinding["recommended_orchestrator_action"] => {
  const normalized = asString(value)?.toLowerCase();
  if (
    normalized === "add_blocker" ||
    normalized === "escalate_existing_blocker" ||
    normalized === "request_manual_review" ||
    normalized === "ignore_duplicate"
  ) {
    return normalized;
  }
  if (normalized === "escalate_for_review") {
    return manualReviewRequired ? "request_manual_review" : "add_blocker";
  }
  if (dispositionImpact === "uncertain") {
    return "request_manual_review";
  }
  return "add_blocker";
};

const normalizeRawModelOutput = (
  decoded: unknown,
  input: HiddenRiskInput,
): unknown => {
  const raw = asRecord(decoded);
  if (!raw) {
    return decoded;
  }

  const rawFindings = Array.isArray(raw["hidden_risk_findings"])
    ? raw["hidden_risk_findings"].map((finding) => asRecord(finding)).filter((finding): finding is Record<string, unknown> => Boolean(finding))
    : [];
  const rawCitations = Array.isArray(raw["citations"])
    ? raw["citations"].map((citation) => asRecord(citation)).filter((citation): citation is Record<string, unknown> => Boolean(citation))
    : [];

  const summary = asRecord(raw["hidden_risk_summary"]);
  const result = inferResultFromRaw(raw, rawFindings);
  const overallDispositionImpact = normalizeDispositionImpact(
    summary?.["overall_disposition_impact"] ??
      summary?.["disposition_impact"] ??
      raw["disposition"] ??
      raw["overall_disposition_impact"] ??
      (result === "hidden_risk_present" ? "not_ready" : result === "no_hidden_risk" ? "none" : "uncertain"),
  );
  const manualReviewRequired = asBoolean(summary?.["manual_review_required"]) ?? (overallDispositionImpact !== "none");
  const fallbackInputCitations = [
    ...input.deterministic_snapshot.deterministic_evidence.map((evidence, index) => ({
      citation_id: evidence.evidence_id || `det_${index + 1}`,
      source_type: "deterministic_evidence",
      source_label: evidence.source_label,
      locator: "deterministic summary",
      excerpt: evidence.detail || evidence.source_label,
    })),
    ...input.narrative_evidence_bundle.map((source) => ({
      citation_id: source.source_id,
      source_type: source.source_type,
      source_label: source.source_label,
      locator: source.locator || "n/a",
      excerpt: source.excerpt,
    })),
  ];
  const normalizedCitations = [
    ...rawCitations.map((citation, index) => ({
      citation_id: asString(citation["citation_id"]) || `cit_${index + 1}`,
      source_type: asString(citation["source_type"]) || "narrative_source",
      source_label: asString(citation["source_label"]) || `Source ${index + 1}`,
      locator: asString(citation["locator"]) || "n/a",
      excerpt: asString(citation["excerpt"]) || "No excerpt provided.",
    })),
    ...fallbackInputCitations,
  ].filter(
    (citation, index, items) =>
      items.findIndex((candidate) => candidate.citation_id === citation.citation_id) === index,
  );
  const citationMap = new Map(normalizedCitations.map((citation) => [citation.citation_id, citation]));
  const citationIdsBySourceLabel = new Map(
    normalizedCitations.map((citation) => [citation.source_label.toLowerCase(), citation.citation_id]),
  );

  const expandedFindings = rawFindings.flatMap((finding, index) => {
    const title =
      asString(finding["title"]) ||
      asString(finding["finding_title"]) ||
      `Hidden risk finding ${index + 1}`;
    const rationale = asString(finding["rationale"]) || asString(finding["summary"]) || title;
    const citationIds = asStringArray(finding["citation_ids"]);
    const sourceLabels = asStringArray(finding["source_labels"]);
    const derivedCitationIds = sourceLabels
      .map((label) => citationIdsBySourceLabel.get(label.toLowerCase()) || null)
      .filter((citationId): citationId is string => Boolean(citationId));
    const validCitationIds = [...new Set([...citationIds, ...derivedCitationIds])].filter((citationId) => citationMap.has(citationId));
    const excerpt = asString(finding["excerpt"]) || "";
    const combinedText = `${title} ${rationale} ${excerpt} ${sourceLabels.join(" ")}`.trim();
    const categories = inferFindingCategories(combinedText);
    const dispositionImpact = normalizeDispositionImpact(
      finding["disposition_impact"] ??
        finding["disposition"] ??
        summary?.["disposition_impact"] ??
        raw["disposition"] ??
        raw["overall_disposition_impact"] ??
        overallDispositionImpact,
    );
    const confidence = normalizeConfidence(
      finding["confidence"],
      validCitationIds.length >= 2 && dispositionImpact === "not_ready" ? "high" : "medium",
    );

    return categories.map((category, categoryIndex) => ({
      finding_id: asString(finding["finding_id"]) || `model_finding_${index + 1}_${categoryIndex + 1}`,
      title: categories.length > 1 ? `${title} (${category})` : title,
      category,
      disposition_impact: dispositionImpact,
      confidence,
      is_duplicate_of_blocker_id: asString(finding["is_duplicate_of_blocker_id"]) || null,
      rationale,
      recommended_orchestrator_action: normalizeAction(
        finding["recommended_orchestrator_action"],
        dispositionImpact,
        manualReviewRequired,
      ),
      citation_ids: validCitationIds,
    }));
  });

  return {
    contract_version: "phase0_hidden_risk_v1",
    status: result === "inconclusive" ? "inconclusive" : "ok",
    patient_id: asString(raw["patient_id"]) || input.deterministic_snapshot.patient_id || null,
    encounter_id: asString(raw["encounter_id"]) || input.deterministic_snapshot.encounter_id || null,
    baseline_verdict: input.deterministic_snapshot.baseline_verdict,
    hidden_risk_summary: {
      result,
      overall_disposition_impact: overallDispositionImpact,
      confidence: normalizeConfidence(summary?.["confidence"], expandedFindings.length >= 2 ? "high" : "medium"),
      summary: asString(summary?.["summary"]) || "Hidden-risk review completed.",
      manual_review_required: manualReviewRequired,
      false_positive_guardrail:
        "No findings are emitted without cited narrative evidence with discharge relevance.",
    },
    hidden_risk_findings: expandedFindings,
    citations: normalizedCitations,
    review_metadata: {
      narrative_sources_reviewed: input.narrative_evidence_bundle.length,
      duplicate_findings_suppressed: 0,
      weak_findings_suppressed: 0,
    },
  };
};

const selectCitationIdsForRenderSafe = (
  findings: HiddenRiskOutput["hidden_risk_findings"],
  maxCitations: number,
): string[] => {
  const selected: string[] = [];

  for (const finding of findings) {
    for (const citationId of finding.citation_ids) {
      if (!selected.includes(citationId)) {
        selected.push(citationId);
      }
      if (selected.length >= maxCitations) {
        return selected;
      }
    }
  }

  return selected;
};

const buildPromptOpinionSlimSummary = (
  payload: HiddenRiskOutput,
  findings: HiddenRiskOutput["hidden_risk_findings"],
  citations: HiddenRiskOutput["citations"],
): string => {
  const baseline = payload.baseline_verdict;
  const anchorText = citations
    .slice(0, 3)
    .map((citation) => `${citation.source_label}${citation.locator ? ` (${citation.locator})` : ""}`)
    .join("; ");

  if (findings.length === 0) {
    if (payload.status === "inconclusive") {
      const base = `Structured baseline was ${baseline}. Narrative contradiction signals remain unresolved, so manual review is required before discharge.`;
      return anchorText.length > 0 ? `${base} Reviewed anchors: ${anchorText}.` : base;
    }

    return `Structured baseline remains ${baseline}. Narrative review found no additional discharge-changing hidden risk.`;
  }

  const contradictionLine = findings
    .slice(0, 3)
    .map((finding) => finding.category)
    .join(" | ");
  const base = `Structured baseline was ${baseline}. Hidden-risk contradiction requires ${payload.hidden_risk_summary.overall_disposition_impact}.`;
  const evidence = anchorText.length > 0 ? ` Evidence anchors: ${anchorText}.` : "";
  const categories = contradictionLine.length > 0 ? ` Impacted categories: ${contradictionLine}.` : "";
  return `${base}${evidence}${categories}`;
};

const toPromptOpinionSlimPayload = (payload: HiddenRiskOutput): HiddenRiskOutput => {
  const maxFindings = 3;
  const maxCitationIdsPerFinding = 2;
  const maxCitations = 4;
  const findings = payload.hidden_risk_findings.slice(0, maxFindings).map((finding) => ({
    ...finding,
    title: truncateText(finding.title, 84),
    rationale: truncateText(finding.rationale, 120),
    citation_ids: finding.citation_ids.slice(0, maxCitationIdsPerFinding),
  }));

  const selectedCitationIds = selectCitationIdsForRenderSafe(findings, maxCitations);
  const selectedCitationIdSet = new Set(selectedCitationIds);
  const citations = payload.citations
    .filter((citation) => selectedCitationIdSet.has(citation.citation_id))
    .map((citation) => ({
      ...citation,
      locator: truncateText(citation.locator, 64),
      excerpt: truncateText(citation.excerpt, 96),
    }));
  const validCitationIdSet = new Set(citations.map((citation) => citation.citation_id));
  const findingsWithValidCitations = findings.map((finding) => ({
    ...finding,
    citation_ids: finding.citation_ids.filter((citationId) => validCitationIdSet.has(citationId)),
  }));

  return {
    ...payload,
    hidden_risk_summary: {
      ...payload.hidden_risk_summary,
      summary: truncateText(
        buildPromptOpinionSlimSummary(payload, findingsWithValidCitations, citations),
        380,
      ),
      false_positive_guardrail: truncateText(payload.hidden_risk_summary.false_positive_guardrail, 80),
    },
    hidden_risk_findings: findingsWithValidCitations,
    citations,
  };
};

const applyResponseMode = (
  payload: HiddenRiskOutput,
  responseMode: HiddenRiskResponseMode,
): HiddenRiskOutput => {
  if (responseMode === "prompt_opinion_slim") {
    return toPromptOpinionSlimPayload(payload);
  }

  return payload;
};

const applySafetyGuards = (
  rawPayload: HiddenRiskOutput,
  input: HiddenRiskInput,
): HiddenRiskOutput => {
  if (rawPayload.status === "error" || rawPayload.status === "insufficient_context") {
    return buildBasePayload(input, {
      status: rawPayload.status,
      hidden_risk_summary: {
        result: "inconclusive",
        overall_disposition_impact: "uncertain",
        confidence: "low",
        summary: rawPayload.hidden_risk_summary.summary,
        manual_review_required: true,
        false_positive_guardrail:
          "No hidden-risk escalation is returned when the hidden-risk review status is error or insufficient_context.",
      },
      hidden_risk_findings: [],
      citations: [],
      review_metadata: {
        narrative_sources_reviewed: input.narrative_evidence_bundle.length,
        duplicate_findings_suppressed:
          rawPayload.review_metadata.duplicate_findings_suppressed + rawPayload.hidden_risk_findings.length,
        weak_findings_suppressed: rawPayload.review_metadata.weak_findings_suppressed,
      },
    });
  }

  const citationMap = normalizeCitationMap(rawPayload.citations);
  const deterministicBlockers = input.deterministic_snapshot.deterministic_blockers;
  const categorySignals = buildCategorySignals(input);
  const keptFindings: HiddenRiskOutput["hidden_risk_findings"] = [];
  const usedCitationIds = new Set<string>();
  let duplicateSuppressed = 0;
  let weakSuppressed = 0;
  let uncertainRetained = 0;

  for (const finding of rawPayload.hidden_risk_findings) {
    const validCitationIds = finding.citation_ids.filter((citationId) => citationMap.has(citationId));
    if (validCitationIds.length === 0) {
      weakSuppressed += 1;
      continue;
    }

    const duplicateBlocker = findDuplicateBlocker(finding, deterministicBlockers, citationMap);
    if (duplicateBlocker) {
      duplicateSuppressed += 1;
      continue;
    }

    const hasCriticalSignal = hasCriticalEvidence(finding, validCitationIds, citationMap);
    const isContradictoryAcrossNotes = hasCategoryContradiction(finding, categorySignals);

    let normalizedFinding: HiddenRiskFinding = {
      ...finding,
      citation_ids: validCitationIds,
    };

    if (
      finding.disposition_impact === "not_ready" &&
      (finding.confidence === "low" || (validCitationIds.length === 1 && isContradictoryAcrossNotes && !hasCriticalSignal))
    ) {
      normalizedFinding = {
        ...normalizedFinding,
        disposition_impact: "uncertain",
        confidence: "low",
        recommended_orchestrator_action: "request_manual_review",
      };
      uncertainRetained += 1;
    } else if (
      finding.disposition_impact === "caveat" &&
      finding.confidence === "low" &&
      isContradictoryAcrossNotes &&
      !hasCriticalSignal
    ) {
      normalizedFinding = {
        ...normalizedFinding,
        disposition_impact: "uncertain",
        recommended_orchestrator_action: "request_manual_review",
      };
      uncertainRetained += 1;
    }

    if (
      normalizedFinding.disposition_impact === "uncertain" &&
      normalizedFinding.recommended_orchestrator_action !== "request_manual_review"
    ) {
      normalizedFinding = {
        ...normalizedFinding,
        recommended_orchestrator_action: "request_manual_review",
      };
    }

    for (const citationId of validCitationIds) {
      usedCitationIds.add(citationId);
    }
    keptFindings.push(normalizedFinding);
  }

  const keptCitations = rawPayload.citations.filter((citation) =>
    usedCitationIds.has(citation.citation_id),
  );

  const hasNotReadyFinding = keptFindings.some((finding) => finding.disposition_impact === "not_ready");
  const hasCaveatFinding = keptFindings.some((finding) => finding.disposition_impact === "caveat");
  const hasUncertainFinding = keptFindings.some(
    (finding) => finding.disposition_impact === "uncertain",
  );
  const hasMaterialFinding = hasNotReadyFinding || hasCaveatFinding;
  const contradictionVisibleWithoutMaterialEscalation =
    !hasMaterialFinding &&
    (rawPayload.status === "inconclusive" || hasUncertainFinding || uncertainRetained > 0);

  const status: HiddenRiskOutput["status"] = contradictionVisibleWithoutMaterialEscalation
    ? "inconclusive"
    : "ok";
  const result: HiddenRiskOutput["hidden_risk_summary"]["result"] = hasMaterialFinding
    ? "hidden_risk_present"
    : status === "inconclusive"
      ? "inconclusive"
      : "no_hidden_risk";
  const overallDispositionImpact: HiddenRiskOutput["hidden_risk_summary"]["overall_disposition_impact"] =
    hasNotReadyFinding ? "not_ready" : hasCaveatFinding ? "caveat" : status === "inconclusive" ? "uncertain" : "none";
  const summary = hasMaterialFinding
    ? buildEvidenceLinkedSummary(input.deterministic_snapshot.baseline_verdict, keptFindings, keptCitations)
    : status === "inconclusive"
      ? buildInconclusiveSummary(input, keptFindings, keptCitations)
      : buildNoHiddenRiskSummary(input);

  return buildBasePayload(input, {
    ...rawPayload,
    status,
    hidden_risk_summary: {
      result,
      overall_disposition_impact: overallDispositionImpact,
      confidence: determineSummaryConfidence(keptFindings),
      summary,
      manual_review_required: status === "inconclusive" || hasUncertainFinding,
      false_positive_guardrail:
        "Duplicate deterministic blockers, uncited findings, and low-confidence escalations are suppressed or downgraded before hidden-risk output is returned.",
    },
    hidden_risk_findings: keptFindings,
    citations: keptCitations,
    review_metadata: {
      narrative_sources_reviewed: input.narrative_evidence_bundle.length,
      duplicate_findings_suppressed:
        rawPayload.review_metadata.duplicate_findings_suppressed + duplicateSuppressed,
      weak_findings_suppressed:
        rawPayload.review_metadata.weak_findings_suppressed + weakSuppressed,
    },
  });
};

export const surfaceHiddenRisks = async (
  rawInput: unknown,
  options?: SurfaceHiddenRiskOptions,
): Promise<SurfaceHiddenRiskResult> => {
  const responseMode = options?.responseMode ?? "full";
  const parsedInputResult = hiddenRiskInputSchema.safeParse(rawInput);
  if (!parsedInputResult.success) {
    throw new Error(`Invalid input for surface_hidden_risks: ${parsedInputResult.error.message}`);
  }

  const input = parsedInputResult.data;
  if (input.narrative_evidence_bundle.length === 0) {
    return {
      payload: applyResponseMode(buildInsufficientContextPayload(input), responseMode),
      provider: "none",
    };
  }

  const llmClient = options?.llmClientOverride || getHiddenRiskLlmClient();

  try {
    const llmResult = await llmClient.generateHiddenRiskResponse(input);
    const decoded = parseJsonObject(llmResult.rawText);
    const normalizedDecoded = normalizeRawModelOutput(decoded, input);
    const parsedOutputResult = hiddenRiskOutputSchema.safeParse(normalizedDecoded);
    if (!parsedOutputResult.success) {
      throw new Error(`Model output violated hidden-risk contract: ${parsedOutputResult.error.message}`);
    }

    const safeOutput = applySafetyGuards(parsedOutputResult.data, input);
    return {
      payload: applyResponseMode(safeOutput, responseMode),
      provider: llmResult.provider,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      payload: applyResponseMode(buildErrorPayload(input, message), responseMode),
      provider: "none",
    };
  }
};
