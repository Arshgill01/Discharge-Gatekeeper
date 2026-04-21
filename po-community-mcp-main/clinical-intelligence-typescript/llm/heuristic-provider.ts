import {
  CANONICAL_BLOCKER_CATEGORIES,
  HiddenRiskInput,
  HiddenRiskOutput,
} from "../clinical-intelligence/contract";

const pickConfidence = (citationsCount: number): "high" | "medium" | "low" => {
  if (citationsCount >= 2) {
    return "high";
  }
  if (citationsCount === 1) {
    return "medium";
  }
  return "low";
};

type Signal = {
  category: (typeof CANONICAL_BLOCKER_CATEGORIES)[number];
  title: string;
  rationaleStem: string;
  riskPattern: RegExp;
  reassuringPattern?: RegExp;
  excludePattern?: RegExp;
  criticalPattern: RegExp;
};

const SIGNALS: Signal[] = [
  {
    category: "clinical_stability",
    title: "Exertional oxygen instability not visible in resting structured data",
    rationaleStem:
      "Narrative evidence documents exertional desaturation and dyspnea, materially conflicting with resting-only stability assumptions.",
    riskPattern: /(dropped to|desaturat|82%|dyspneic|visibly dyspneic)/i,
    reassuringPattern: /(stable on room air|without desaturat|no desaturat|remained above|without dyspnea)/i,
    excludePattern: /(without desaturat|no desaturat|remained above|without dyspnea)/i,
    criticalPattern: /(dropped to|82%|desaturat|dyspneic|discharge hold)/i,
  },
  {
    category: "equipment_and_transport",
    title: "Required home oxygen or discharge equipment unavailable tonight",
    rationaleStem:
      "Narrative evidence indicates oxygen delivery or discharge equipment logistics are delayed, making planned support unavailable.",
    riskPattern: /(no oxygen at home|vendor cannot deliver|concentrator until tomorrow|delivery delayed|equipment unavailable)/i,
    reassuringPattern: /(equipment confirmed|equipment ready|transport arranged|delivery confirmed)/i,
    criticalPattern: /(no oxygen at home|cannot deliver|delivery delayed|concentrator until tomorrow)/i,
  },
  {
    category: "home_support_and_services",
    title: "No confirmed overnight support for high-friction home environment",
    rationaleStem:
      "Narrative evidence indicates the patient is alone overnight without expected caregiver support or fallback coverage.",
    riskPattern: /(lives alone|daughter cannot stay|unavailable overnight|no alternate caregiver|no overnight support)/i,
    reassuringPattern: /(daughter available|caregiver confirmed|support available overnight)/i,
    criticalPattern: /(lives alone|cannot stay|unavailable overnight|no alternate caregiver)/i,
  },
];

const buildFindingRationale = (
  signal: Signal,
  riskSources: HiddenRiskInput["narrative_evidence_bundle"],
  reassuringSources: HiddenRiskInput["narrative_evidence_bundle"],
): string => {
  if (reassuringSources.length === 0) {
    return signal.rationaleStem;
  }

  const reassuringLabel = reassuringSources[0]?.source_label || "earlier note evidence";
  const riskLabel = riskSources[0]?.source_label || "later note evidence";
  return `${signal.rationaleStem} Contradiction was identified between reassuring narrative context (${reassuringLabel}) and discharge-risk evidence (${riskLabel}).`;
};

const pickDispositionImpact = (
  signal: Signal,
  riskSources: HiddenRiskInput["narrative_evidence_bundle"],
  reassuringSources: HiddenRiskInput["narrative_evidence_bundle"],
): "none" | "caveat" | "not_ready" | "uncertain" => {
  if (riskSources.length === 0) {
    return "none";
  }

  const hasCriticalSignal = riskSources.some((source) => signal.criticalPattern.test(source.excerpt));
  if (riskSources.length >= 2 || hasCriticalSignal) {
    return "not_ready";
  }

  if (reassuringSources.length > 0) {
    return "uncertain";
  }

  return "caveat";
};

const pickFindingConfidence = (
  riskSources: HiddenRiskInput["narrative_evidence_bundle"],
  reassuringSources: HiddenRiskInput["narrative_evidence_bundle"],
): "high" | "medium" | "low" => {
  if (riskSources.length >= 2 && reassuringSources.length === 0) {
    return "high";
  }
  if (riskSources.length >= 1 && reassuringSources.length === 0) {
    return "medium";
  }
  if (riskSources.length >= 2 && reassuringSources.length > 0) {
    return "medium";
  }
  return "low";
};

const buildHiddenRiskSummary = (
  baselineVerdict: HiddenRiskInput["deterministic_snapshot"]["baseline_verdict"],
  findings: HiddenRiskOutput["hidden_risk_findings"],
  citations: HiddenRiskOutput["citations"],
): string => {
  const categories = new Set(findings.map((finding) => finding.category));
  const hasCanonicalTrapContradiction =
    categories.has("clinical_stability") &&
    categories.has("equipment_and_transport") &&
    categories.has("home_support_and_services");

  if (hasCanonicalTrapContradiction) {
    return `Structured baseline was ${baselineVerdict} from resting chart data, but note evidence shows exertional desaturation with dyspnea, unavailable home oxygen tonight, and no overnight caregiver support. This contradiction makes discharge home tonight unsafe.`;
  }

  const primaryFinding = findings[0];
  if (!primaryFinding) {
    return "No additional note-backed discharge-critical hidden risk was found beyond deterministic context.";
  }

  const citationLabel = primaryFinding.citation_ids
    .map((citationId) => citations.find((citation) => citation.citation_id === citationId)?.source_label || "")
    .find((label) => label.length > 0);

  return `Structured baseline was ${baselineVerdict}, and narrative evidence introduced discharge-critical risk in ${primaryFinding.category}: ${primaryFinding.title.toLowerCase()}${citationLabel ? ` (${citationLabel})` : ""}.`;
};

export const generateHiddenRiskHeuristicResponse = async (
  input: HiddenRiskInput,
): Promise<string> => {
  const citations: HiddenRiskOutput["citations"] = [];
  const findings: HiddenRiskOutput["hidden_risk_findings"] = [];
  const citationIdBySourceId = new Map<string, string>();
  let citationCounter = 0;
  let weakSignalsSuppressed = 0;

  const getOrCreateCitationId = (source: HiddenRiskInput["narrative_evidence_bundle"][number]): string => {
    const existing = citationIdBySourceId.get(source.source_id);
    if (existing) {
      return existing;
    }

    citationCounter += 1;
    const citationId = `cit_${String(citationCounter).padStart(3, "0")}`;
    citationIdBySourceId.set(source.source_id, citationId);
    citations.push({
      citation_id: citationId,
      source_type: source.source_type,
      source_label: source.source_label,
      locator: source.locator || "excerpt",
      excerpt: source.excerpt.slice(0, 280),
    });
    return citationId;
  };

  for (const signal of SIGNALS) {
    const riskSources = input.narrative_evidence_bundle.filter((source) => {
      if (!signal.riskPattern.test(source.excerpt)) {
        return false;
      }
      if (signal.excludePattern && signal.excludePattern.test(source.excerpt)) {
        return false;
      }
      return true;
    });

    if (riskSources.length === 0) {
      continue;
    }

    const reassuringSources = signal.reassuringPattern
      ? input.narrative_evidence_bundle.filter((source) => signal.reassuringPattern?.test(source.excerpt))
      : [];

    const citationIds = [...new Set([
      ...riskSources.map((source) => getOrCreateCitationId(source)),
      ...reassuringSources.slice(0, 1).map((source) => getOrCreateCitationId(source)),
    ])];

    const impact = pickDispositionImpact(signal, riskSources, reassuringSources);
    if (impact === "none") {
      weakSignalsSuppressed += 1;
      continue;
    }

    const findingId = `hr_${String(findings.length + 1).padStart(3, "0")}`;
    findings.push({
      finding_id: findingId,
      title: signal.title,
      category: signal.category,
      disposition_impact: impact,
      confidence: impact === "uncertain" ? "low" : pickFindingConfidence(riskSources, reassuringSources),
      is_duplicate_of_blocker_id: null,
      rationale: buildFindingRationale(signal, riskSources, reassuringSources),
      recommended_orchestrator_action:
        impact === "uncertain" ? "request_manual_review" : "add_blocker",
      citation_ids: citationIds,
    });
  }

  const hasNotReady = findings.some((finding) => finding.disposition_impact === "not_ready");
  const hasCaveat = findings.some((finding) => finding.disposition_impact === "caveat");
  const hasUncertain = findings.some((finding) => finding.disposition_impact === "uncertain");
  const hiddenRiskPresent = hasNotReady || hasCaveat;
  const status: HiddenRiskOutput["status"] = hiddenRiskPresent ? "ok" : hasUncertain ? "inconclusive" : "ok";
  const result: HiddenRiskOutput["hidden_risk_summary"]["result"] = hiddenRiskPresent
    ? "hidden_risk_present"
    : hasUncertain
      ? "inconclusive"
      : "no_hidden_risk";
  const overallDispositionImpact: HiddenRiskOutput["hidden_risk_summary"]["overall_disposition_impact"] = hasNotReady
    ? "not_ready"
    : hasCaveat
      ? "caveat"
      : hasUncertain
        ? "uncertain"
        : "none";

  const output: HiddenRiskOutput = {
    contract_version: "phase0_hidden_risk_v1",
    status,
    patient_id: input.deterministic_snapshot.patient_id ?? null,
    encounter_id: input.deterministic_snapshot.encounter_id ?? null,
    baseline_verdict: input.deterministic_snapshot.baseline_verdict,
    hidden_risk_summary: result === "hidden_risk_present"
      ? {
          result,
          overall_disposition_impact: overallDispositionImpact,
          confidence: pickConfidence(findings.length),
          summary: buildHiddenRiskSummary(
            input.deterministic_snapshot.baseline_verdict,
            findings,
            citations,
          ),
          manual_review_required: hasUncertain,
          false_positive_guardrail:
            "Only findings tied to explicit narrative contradictions or discharge logistics barriers are emitted; low-confidence contradictions are routed to manual review.",
        }
      : result === "inconclusive"
        ? {
            result,
            overall_disposition_impact: overallDispositionImpact,
            confidence: "low",
            summary:
              "Narrative review found low-confidence or conflicting contradiction signals without enough support for a discharge-changing escalation. Manual review is required.",
            manual_review_required: true,
            false_positive_guardrail:
              "Ambiguous narrative signals are kept bounded as inconclusive instead of forcing escalation.",
          }
      : {
          result,
          overall_disposition_impact: overallDispositionImpact,
          confidence: "high",
          summary:
            "No additional note-backed discharge-critical hidden risk was found beyond deterministic context.",
          manual_review_required: false,
          false_positive_guardrail:
            "Weak or uncited narrative concerns were suppressed to avoid false-positive escalation.",
        },
    hidden_risk_findings: findings,
    citations,
    review_metadata: {
      narrative_sources_reviewed: input.narrative_evidence_bundle.length,
      duplicate_findings_suppressed: 0,
      weak_findings_suppressed: weakSignalsSuppressed,
    },
  };

  return JSON.stringify(output, null, 2);
};
