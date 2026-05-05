import { HiddenRiskInput } from "./contract";

export const HIDDEN_RISK_SYSTEM_PROMPT =
  "You are the hidden-risk analysis layer for discharge safety review. Review only the evidence provided. Find narrative-only or contradiction-based risks that materially change discharge readiness, including contradiction across multiple notes when present. Suppress duplicates, weak concerns, and uncited claims. Return only the JSON schema defined by the contract.";

export const buildHiddenRiskUserPrompt = (input: HiddenRiskInput): string => {
  return [
    "Task: Analyze the deterministic snapshot and narrative bundle for discharge-critical hidden risk.",
    "Constraints:",
    "- Emit only a single JSON object with contract_version=phase0_hidden_risk_v1.",
    "- Output raw JSON only: no markdown, no prose prefix/suffix, no comments.",
    "- Never invent sources, locators, or excerpts.",
    "- Every non-duplicate finding must have citation_ids that resolve inside citations[].",
    "- Suppress duplicate findings already represented by deterministic blockers.",
    "- If a finding is a duplicate, use recommended_orchestrator_action=ignore_duplicate and do not escalate disposition.",
    "- Evaluate contradiction across multiple notes; when signals conflict, cite both contradiction and reinforcing evidence.",
    "- Make hidden_risk_summary.summary contradiction-first: state how the structured baseline looked, what narrative evidence changed that story, and which source labels anchor the change.",
    "- For hidden_risk_present, make each finding title and rationale concrete enough to answer: what hidden risk changed the answer?",
    "- For no_hidden_risk, explicitly say no discharge-changing contradiction was found and keep hidden_risk_findings=[].",
    "- For inconclusive or insufficient_context behavior, keep findings bounded, require manual review, and do not fabricate escalation.",
    "- Calibrate disposition impact: use not_ready only for discharge-changing evidence, caveat for bounded risk, uncertain for unresolved conflicts.",
    "- If impact is uncertain, set recommended_orchestrator_action=request_manual_review and manual_review_required=true.",
    "- Prefer no_hidden_risk over weak speculation.",
    "- Prefer inconclusive over uncited certainty.",
    "- If evidence is insufficient or contradictory, use inconclusive and manual_review_required=true.",
    "",
    "Input payload:",
    JSON.stringify(input, null, 2),
  ].join("\n");
};

const truncateText = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
};

export const buildHiddenRiskCompactUserPrompt = (input: HiddenRiskInput): string => {
  const compactPayload = {
    baseline_verdict: input.deterministic_snapshot.baseline_verdict,
    deterministic_summary: truncateText(input.deterministic_snapshot.deterministic_summary, 220),
    deterministic_blocker_categories: input.deterministic_snapshot.deterministic_blockers
      .map((blocker) => blocker.category)
      .slice(0, 6),
    narrative_sources: input.narrative_evidence_bundle.map((source) => ({
      citation_id: source.source_id,
      source_label: source.source_label,
      source_type: source.source_type,
      locator: source.locator || source.timestamp || "n/a",
      excerpt: truncateText(source.excerpt, 360),
    })),
  };

  return [
    "Task: identify only discharge-changing hidden risk.",
    "Return raw compact JSON only. Do not quote note text.",
    'Schema: {"status":"ok","hidden_risk_summary":{"result":"hidden_risk_present|no_hidden_risk|inconclusive","overall_disposition_impact":"not_ready|caveat|uncertain|none","confidence":"high|medium|low","summary":"one sentence","manual_review_required":false},"hidden_risk_findings":[{"title":"short title","category":"clinical_stability|equipment_and_transport|home_support_and_services|pending_diagnostics|medication_reconciliation|follow_up_and_referrals|patient_education|administrative_and_documentation","disposition_impact":"not_ready|caveat|uncertain|none","confidence":"high|medium|low","rationale":"one short sentence","recommended_orchestrator_action":"add_blocker|request_manual_review|ignore_duplicate","citation_ids":["source_id"]}]}',
    "Rules: use only source_ids from narrative_sources; do not invent citations; suppress weak/uncited claims; use not_ready only for cited discharge-changing evidence.",
    "",
    "Compact input:",
    JSON.stringify(compactPayload),
  ].join("\n");
};
