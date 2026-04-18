import { A2ATaskInput, ReconciliationResult } from "../types";

const SYNTHESIS_GUARDRAILS = [
  "Use only MCP outputs supplied in this payload.",
  "Do not invent findings, citations, or patient facts.",
  "If hidden-risk review is unavailable, state that explicitly and preserve deterministic posture.",
  "Maintain assistive, non-autonomous tone and require clinician review where flagged.",
  "When contradiction exists, explain the structured baseline vs narrative evidence change.",
];

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
  const contradictionLine = reconciled.contradiction_summary.trim().length > 0
    ? reconciled.contradiction_summary
    : "No additional narrative contradiction changed the deterministic posture.";

  const narrative = [
    `Final verdict: ${reconciled.final_verdict}.`,
    `Decision matrix row: ${reconciled.decision_matrix_row} (${reconciled.decision_matrix_action}).`,
    `Hidden-risk status: ${reconciled.hidden_risk_run_status}.`,
    `Contradiction summary: ${contradictionLine}`,
    reconciled.manual_review_required
      ? "Manual review is required before discharge due to unresolved ambiguity or unavailable narrative review."
      : "Manual review flag is not set by matrix policy.",
    "This output is assistive and does not replace clinician discharge authority.",
  ].join(" ");

  return {
    prompt_used: prompt,
    narrative,
  };
};
