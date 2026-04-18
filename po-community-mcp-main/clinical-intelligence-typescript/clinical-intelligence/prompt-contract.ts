import { HiddenRiskInput } from "./contract";

export const HIDDEN_RISK_SYSTEM_PROMPT =
  "You are the hidden-risk analysis layer for discharge safety review. Review only the evidence provided. Find narrative-only or contradiction-based risks that materially change discharge readiness. Suppress duplicates, weak concerns, and uncited claims. Return only the JSON schema defined by the contract.";

export const buildHiddenRiskUserPrompt = (input: HiddenRiskInput): string => {
  return [
    "Task: Analyze the deterministic snapshot and narrative bundle for discharge-critical hidden risk.",
    "Constraints:",
    "- Emit only a single JSON object with contract_version=phase0_hidden_risk_v1.",
    "- Never invent sources, locators, or excerpts.",
    "- Suppress duplicate findings already represented by deterministic blockers.",
    "- Prefer no_hidden_risk over weak speculation.",
    "- If evidence is insufficient or contradictory, use inconclusive and manual_review_required=true.",
    "",
    "Input payload:",
    JSON.stringify(input, null, 2),
  ].join("\n");
};
