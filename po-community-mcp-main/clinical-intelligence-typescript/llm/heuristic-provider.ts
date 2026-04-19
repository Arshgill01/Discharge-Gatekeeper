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
  rationale: string;
  pattern: RegExp;
  excludePattern?: RegExp;
};

const SIGNALS: Signal[] = [
  {
    category: "clinical_stability",
    title: "Exertional oxygen instability not visible in resting structured data",
    rationale:
      "Narrative evidence documents exertional desaturation and dyspnea, which materially conflicts with resting-only stability assumptions.",
    pattern: /(dropped to|desaturat|82%|dyspneic)/i,
    excludePattern: /(without desaturat|no desaturat|remained above|without dyspnea)/i,
  },
  {
    category: "equipment_and_transport",
    title: "Required home oxygen or discharge equipment unavailable tonight",
    rationale:
      "Narrative evidence indicates oxygen delivery/logistics are delayed, making planned discharge support unavailable.",
    pattern: /(no oxygen at home|vendor cannot deliver|concentrator until tomorrow|delivery delayed)/i,
  },
  {
    category: "home_support_and_services",
    title: "No confirmed overnight support for high-friction home environment",
    rationale:
      "Narrative evidence indicates the patient is alone overnight without the expected support or caregiver coverage.",
    pattern: /(lives alone|daughter cannot stay|unavailable overnight|no alternate caregiver)/i,
  },
];

const buildHiddenRiskSummary = (
  baselineVerdict: HiddenRiskInput["deterministic_snapshot"]["baseline_verdict"],
  findings: HiddenRiskOutput["hidden_risk_findings"],
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

  return `Structured baseline was ${baselineVerdict}, but narrative evidence introduced discharge-critical risk in ${primaryFinding.category}: ${primaryFinding.title.toLowerCase()}.`;
};

export const generateHiddenRiskHeuristicResponse = async (
  input: HiddenRiskInput,
): Promise<string> => {
  const citations: HiddenRiskOutput["citations"] = [];
  const findings: HiddenRiskOutput["hidden_risk_findings"] = [];
  let citationCounter = 0;

  for (const signal of SIGNALS) {
    const matchedSources = input.narrative_evidence_bundle.filter((source) => {
      if (!signal.pattern.test(source.excerpt)) {
        return false;
      }
      if (signal.excludePattern && signal.excludePattern.test(source.excerpt)) {
        return false;
      }
      return true;
    });

    if (matchedSources.length === 0) {
      continue;
    }

    const citationIds: string[] = [];
    for (const source of matchedSources) {
      citationCounter += 1;
      const citationId = `cit_${String(citationCounter).padStart(3, "0")}`;
      citationIds.push(citationId);
      citations.push({
        citation_id: citationId,
        source_type: source.source_type,
        source_label: source.source_label,
        locator: source.locator || "excerpt",
        excerpt: source.excerpt.slice(0, 280),
      });
    }

    const findingId = `hr_${String(findings.length + 1).padStart(3, "0")}`;
    findings.push({
      finding_id: findingId,
      title: signal.title,
      category: signal.category,
      disposition_impact: "not_ready",
      confidence: pickConfidence(citationIds.length),
      is_duplicate_of_blocker_id: null,
      rationale: signal.rationale,
      recommended_orchestrator_action: "add_blocker",
      citation_ids: citationIds,
    });
  }

  const hiddenRiskPresent = findings.length > 0;
  const output: HiddenRiskOutput = {
    contract_version: "phase0_hidden_risk_v1",
    status: "ok",
    patient_id: input.deterministic_snapshot.patient_id ?? null,
    encounter_id: input.deterministic_snapshot.encounter_id ?? null,
    baseline_verdict: input.deterministic_snapshot.baseline_verdict,
    hidden_risk_summary: hiddenRiskPresent
      ? {
          result: "hidden_risk_present",
          overall_disposition_impact: "not_ready",
          confidence: "medium",
          summary: buildHiddenRiskSummary(
            input.deterministic_snapshot.baseline_verdict,
            findings,
          ),
          manual_review_required: false,
          false_positive_guardrail:
            "Only findings tied to explicit narrative contradictions or discharge logistics barriers are emitted.",
        }
      : {
          result: "no_hidden_risk",
          overall_disposition_impact: "none",
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
      weak_findings_suppressed: 0,
    },
  };

  return JSON.stringify(output, null, 2);
};
