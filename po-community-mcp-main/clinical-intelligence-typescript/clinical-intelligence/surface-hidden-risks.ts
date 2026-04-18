import {
  DeterministicBlocker,
  HiddenRiskFinding,
  HiddenRiskInput,
  HiddenRiskOutput,
  hiddenRiskInputSchema,
  hiddenRiskOutputSchema,
} from "./contract";
import { getHiddenRiskLlmClient } from "../llm/client";

type SurfaceHiddenRiskResult = {
  payload: HiddenRiskOutput;
  provider: string;
};

const parseJsonObject = (text: string): unknown => {
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

const sharesMeaningfulTokens = (a: string, b: string): boolean => {
  const normalize = (value: string): string[] =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 4);

  const aTokens = new Set(normalize(a));
  const bTokens = normalize(b);
  let overlap = 0;
  for (const token of bTokens) {
    if (aTokens.has(token)) {
      overlap += 1;
    }
  }
  return overlap >= 2;
};

const findDuplicateBlocker = (
  finding: HiddenRiskFinding,
  deterministicBlockers: DeterministicBlocker[],
): DeterministicBlocker | null => {
  for (const blocker of deterministicBlockers) {
    if (blocker.category !== finding.category) {
      continue;
    }
    if (sharesMeaningfulTokens(blocker.description, finding.rationale)) {
      return blocker;
    }
  }
  return null;
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
        "Narrative evidence bundle is missing or empty. Hidden-risk review cannot run without note or document evidence.",
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

const applySafetyGuards = (
  rawPayload: HiddenRiskOutput,
  input: HiddenRiskInput,
): HiddenRiskOutput => {
  const citationMap = normalizeCitationMap(rawPayload.citations);
  const deterministicBlockers = input.deterministic_snapshot.deterministic_blockers;
  const keptFindings: HiddenRiskOutput["hidden_risk_findings"] = [];
  const usedCitationIds = new Set<string>();
  let duplicateSuppressed = 0;
  let weakSuppressed = 0;

  for (const finding of rawPayload.hidden_risk_findings) {
    const validCitationIds = finding.citation_ids.filter((citationId) => citationMap.has(citationId));
    if (validCitationIds.length === 0) {
      weakSuppressed += 1;
      continue;
    }

    const duplicateBlocker = findDuplicateBlocker(finding, deterministicBlockers);
    if (duplicateBlocker) {
      duplicateSuppressed += 1;
      continue;
    }

    if (finding.confidence === "low" && finding.disposition_impact === "not_ready") {
      weakSuppressed += 1;
      continue;
    }

    for (const citationId of validCitationIds) {
      usedCitationIds.add(citationId);
    }
    keptFindings.push({
      ...finding,
      citation_ids: validCitationIds,
    });
  }

  const keptCitations = rawPayload.citations.filter((citation) =>
    usedCitationIds.has(citation.citation_id),
  );

  const hiddenRiskPresent = keptFindings.length > 0;
  return buildBasePayload(input, {
    ...rawPayload,
    hidden_risk_summary: hiddenRiskPresent
      ? rawPayload.hidden_risk_summary
      : {
          result: rawPayload.status === "inconclusive" ? "inconclusive" : "no_hidden_risk",
          overall_disposition_impact:
            rawPayload.status === "inconclusive" ? "uncertain" : "none",
          confidence: hiddenRiskPresent ? rawPayload.hidden_risk_summary.confidence : "medium",
          summary: hiddenRiskPresent
            ? rawPayload.hidden_risk_summary.summary
            : "No additional discharge-changing hidden risk was found in narrative evidence.",
          manual_review_required: rawPayload.status === "inconclusive",
          false_positive_guardrail:
            "Duplicate, uncited, and weak findings were suppressed before returning hidden-risk output.",
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
): Promise<SurfaceHiddenRiskResult> => {
  const parsedInputResult = hiddenRiskInputSchema.safeParse(rawInput);
  if (!parsedInputResult.success) {
    throw new Error(`Invalid input for surface_hidden_risks: ${parsedInputResult.error.message}`);
  }

  const input = parsedInputResult.data;
  if (input.narrative_evidence_bundle.length === 0) {
    return {
      payload: buildInsufficientContextPayload(input),
      provider: "none",
    };
  }

  const llmClient = getHiddenRiskLlmClient();

  try {
    const llmResult = await llmClient.generateHiddenRiskResponse(input);
    const decoded = parseJsonObject(llmResult.rawText);
    const parsedOutputResult = hiddenRiskOutputSchema.safeParse(decoded);
    if (!parsedOutputResult.success) {
      throw new Error(`Model output violated hidden-risk contract: ${parsedOutputResult.error.message}`);
    }

    const safeOutput = applySafetyGuards(parsedOutputResult.data, input);
    return {
      payload: safeOutput,
      provider: llmResult.provider,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      payload: buildErrorPayload(input, message),
      provider: "none",
    };
  }
};
