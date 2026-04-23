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
