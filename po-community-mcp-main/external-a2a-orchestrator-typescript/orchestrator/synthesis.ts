import { A2ATaskInput, ReconciliationResult } from "../types";

const SYNTHESIS_GUARDRAILS = [
  "Use only MCP outputs supplied in this payload.",
  "Do not invent findings, citations, or patient facts.",
  "If hidden-risk review is unavailable, state that explicitly and preserve deterministic posture.",
  "Maintain assistive, non-autonomous tone and require clinician review where flagged.",
  "When contradiction exists, explain the structured baseline vs narrative evidence change.",
];

type PromptMode = "prompt_1" | "prompt_2" | "prompt_3";

const detectPromptMode = (prompt: string): PromptMode => {
  const normalized = prompt.toLowerCase();
  if (normalized.includes("hidden risk") || normalized.includes("contradiction")) {
    return "prompt_2";
  }
  if (
    normalized.includes("must happen before discharge") ||
    normalized.includes("transition package")
  ) {
    return "prompt_3";
  }
  return "prompt_1";
};

const compactEvidenceAnchor = (
  citation: ReconciliationResult["citations"]["hidden_risk"][number],
): string => {
  const excerpt = citation.excerpt.replace(/\s+/g, " ").trim();
  const shortExcerpt = excerpt.length > 110 ? `${excerpt.slice(0, 107)}...` : excerpt;
  return `${citation.source_label} (${citation.locator}): "${shortExcerpt}"`;
};

const renderPrompt1Narrative = (reconciled: ReconciliationResult): string => {
  const intro = `Structured discharge posture was ${reconciled.deterministic.verdict}. Final reconciled posture is ${reconciled.final_verdict}.`;
  const change = `Disposition change: ${reconciled.contradiction_summary}`;
  const manualReview = reconciled.manual_review_required
    ? "Manual clinician review is required before discharge."
    : "No matrix-level manual-review flag is set.";
  return `${intro} ${change} ${manualReview} This is assistive discharge decision support and does not replace clinician authority.`;
};

const renderPrompt2Narrative = (reconciled: ReconciliationResult): string => {
  const evidenceAnchors = reconciled.citations.hidden_risk
    .slice(0, 2)
    .map(compactEvidenceAnchor);
  const evidenceLine = evidenceAnchors.length > 0
    ? `Key contradiction evidence: ${evidenceAnchors.join(" | ")}.`
    : "No additional hidden-risk citations were provided.";
  const riskLine = reconciled.hidden_risk_result === "hidden_risk_present"
    ? `Hidden-risk findings changed the structured posture from ${reconciled.deterministic.verdict} to ${reconciled.final_verdict}.`
    : `No discharge-changing hidden risk was confirmed; posture remains ${reconciled.final_verdict}.`;

  return `${riskLine} ${reconciled.contradiction_summary} ${evidenceLine} This is assistive discharge decision support and does not replace clinician authority.`;
};

const renderPrompt3Narrative = (reconciled: ReconciliationResult): string => {
  const prioritizedSteps = reconciled.merged_next_steps
    .slice(0, 3)
    .map((step, index) => `${index + 1}. [${step.priority}] ${step.action}`)
    .join(" ");
  const guidance = prioritizedSteps.length > 0
    ? `Before discharge, complete: ${prioritizedSteps}`
    : "Before discharge, complete deterministic transition safeguards and confirm no unresolved blockers.";
  return `${guidance} Final posture remains ${reconciled.final_verdict} because ${reconciled.contradiction_summary.toLowerCase()} This is assistive discharge decision support and does not replace clinician authority.`;
};

export const buildSynthesisPrompt = (
  taskInput: A2ATaskInput,
  reconciled: ReconciliationResult,
): string => {
  return [
    "System role: external A2A orchestrator for Care Transitions Command.",
    "Task: Produce a concise clinician-facing final answer from MCP outputs only.",
    `Prompt from user: ${taskInput.prompt}`,
    "Guardrails:",
    ...SYNTHESIS_GUARDRAILS.map((line) => `- ${line}`),
    "MCP payload:",
    JSON.stringify(reconciled, null, 2),
  ].join("\n");
};

export const renderBoundedSynthesis = (
  taskInput: A2ATaskInput,
  reconciled: ReconciliationResult,
): { prompt_used: string; narrative: string } => {
  if (process.env["A2A_FORCE_SYNTHESIS_ERROR"] === "1") {
    throw new Error("A2A synthesis forced failure");
  }

  const prompt = buildSynthesisPrompt(taskInput, reconciled);
  const mode = detectPromptMode(taskInput.prompt);

  let narrative: string;
  if (mode === "prompt_2") {
    narrative = renderPrompt2Narrative(reconciled);
  } else if (mode === "prompt_3") {
    narrative = renderPrompt3Narrative(reconciled);
  } else {
    narrative = renderPrompt1Narrative(reconciled);
  }

  return {
    prompt_used: prompt,
    narrative,
  };
};
