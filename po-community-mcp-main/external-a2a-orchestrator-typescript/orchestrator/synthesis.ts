import { A2ATaskInput, PromptMode, ReconciliationResult } from "../types";

const SYNTHESIS_GUARDRAILS = [
  "Use only MCP outputs supplied in this payload.",
  "Do not invent findings, citations, or patient facts.",
  "If hidden-risk review is unavailable, state that explicitly and preserve deterministic posture.",
  "Maintain assistive, non-autonomous tone and require clinician review where flagged.",
  "When contradiction exists, explain the structured baseline vs narrative evidence change.",
];

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

const toEvidenceAnchor = (
  anchor: ReconciliationResult["prompt_payload"]["evidence_anchors"][number],
): string => {
  const detail = anchor.detail.replace(/\s+/g, " ").trim();
  const shortDetail = detail.length > 110 ? `${detail.slice(0, 107)}...` : detail;
  return anchor.locator
    ? `${anchor.source_label} (${anchor.locator}): "${shortDetail}"`
    : `${anchor.source_label}: "${shortDetail}"`;
};

const selectDistinctEvidenceAnchors = (
  anchors: ReconciliationResult["prompt_payload"]["evidence_anchors"],
): ReconciliationResult["prompt_payload"]["evidence_anchors"] => {
  const seen = new Set<string>();
  return anchors.filter((anchor) => {
    const key = `${anchor.source}::${anchor.source_label}::${anchor.locator ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const buildEvidenceAnchors = (
  reconciled: ReconciliationResult,
  promptMode: PromptMode,
): ReconciliationResult["prompt_payload"]["evidence_anchors"] => {
  const hiddenRiskAnchors = reconciled.citations.hidden_risk.map((citation) => ({
    id: citation.citation_id,
    source: "hidden_risk" as const,
    source_label: citation.source_label,
    locator: citation.locator,
    detail: citation.excerpt,
  }));
  const deterministicAnchors = reconciled.citations.deterministic.map((citation) => ({
    id: citation.id,
    source: "deterministic" as const,
    source_label: citation.source_label,
    detail: citation.detail,
  }));

  if (promptMode === "prompt_3") {
    const actionAnchors = reconciled.merged_next_steps.flatMap((step) => step.citation_anchors);
    return selectDistinctEvidenceAnchors(actionAnchors).slice(0, 4);
  }

  if (hiddenRiskAnchors.length > 0) {
    return selectDistinctEvidenceAnchors(hiddenRiskAnchors).slice(0, promptMode === "prompt_2" ? 3 : 2);
  }

  return selectDistinctEvidenceAnchors(deterministicAnchors).slice(0, 2);
};

const buildImpactedCategories = (reconciled: ReconciliationResult): string[] => {
  const categories = reconciled.hidden_risk?.status === "ok" &&
      reconciled.hidden_risk.hidden_risk_findings.length > 0
    ? reconciled.hidden_risk.hidden_risk_findings.map((finding) => finding.category)
    : reconciled.merged_blockers.map((blocker) => blocker.category);

  return [...new Set(categories)];
};

const buildHeadline = (
  promptMode: PromptMode,
  reconciled: ReconciliationResult,
): string => {
  if (promptMode === "prompt_2") {
    if (reconciled.hidden_risk_result === "hidden_risk_present") {
      return `Contradiction: structured baseline ${reconciled.deterministic.verdict} changed to ${reconciled.final_verdict} on cited narrative evidence.`;
    }
    return `No discharge-changing contradiction was confirmed; reconciled verdict is ${reconciled.final_verdict}.`;
  }

  if (promptMode === "prompt_3") {
    return `Final verdict ${reconciled.final_verdict}: complete the cited owner-assigned actions before discharge proceeds.`;
  }

  if (reconciled.hidden_risk_result === "hidden_risk_present") {
    return `Structured baseline ${reconciled.deterministic.verdict}; final verdict ${reconciled.final_verdict} after cited hidden-risk escalation.`;
  }

  if (reconciled.manual_review_required) {
    return `Structured baseline ${reconciled.deterministic.verdict}; final verdict ${reconciled.final_verdict} pending manual hidden-risk review.`;
  }

  return `Structured baseline ${reconciled.deterministic.verdict}; final verdict ${reconciled.final_verdict} with no discharge-changing hidden risk confirmed.`;
};

const buildClinicianHandoffBrief = (
  reconciled: ReconciliationResult,
): string | undefined => {
  if (reconciled.merged_next_steps.length === 0) {
    return undefined;
  }

  const leadingStep = reconciled.merged_next_steps[0];
  const impactedCategories = buildImpactedCategories(reconciled).slice(0, 3).join(", ");
  return `Hold discharge at ${reconciled.final_verdict}; ${leadingStep.owner} should lead the first action. Focus domains: ${impactedCategories || "none"}.`;
};

const buildPatientDischargeGuidance = (
  reconciled: ReconciliationResult,
): string | undefined => {
  if (reconciled.final_verdict !== "not_ready") {
    return undefined;
  }

  return "Tell the patient discharge is on hold until the cited blockers are resolved and a clinician reviews the updated transition plan.";
};

export const buildPromptPayload = (
  taskInput: A2ATaskInput,
  reconciled: ReconciliationResult,
): ReconciliationResult["prompt_payload"] => {
  const promptMode = detectPromptMode(taskInput.prompt);
  const evidenceAnchors = buildEvidenceAnchors(reconciled, promptMode);
  const actionPlan = promptMode === "prompt_3" ? reconciled.merged_next_steps.slice(0, 4) : [];

  return {
    prompt_mode: promptMode,
    headline: buildHeadline(promptMode, reconciled),
    baseline_structured_verdict: reconciled.deterministic.verdict,
    final_verdict: reconciled.final_verdict,
    structured_baseline_summary: reconciled.deterministic.summary,
    reconciliation_summary: reconciled.contradiction_summary,
    evidence_anchors: evidenceAnchors,
    impacted_blocker_categories: buildImpactedCategories(reconciled),
    action_plan: actionPlan,
    clinician_handoff_brief:
      promptMode === "prompt_3" ? buildClinicianHandoffBrief(reconciled) : undefined,
    patient_discharge_guidance:
      promptMode === "prompt_3" ? buildPatientDischargeGuidance(reconciled) : undefined,
  };
};

const renderPrompt1Narrative = (
  reconciled: ReconciliationResult,
  promptPayload: ReconciliationResult["prompt_payload"],
): string => {
  const categories = promptPayload.impacted_blocker_categories.slice(0, 3).join(", ") || "none";
  const evidenceLine = promptPayload.evidence_anchors.length > 0
    ? `Cited evidence: ${promptPayload.evidence_anchors.map(toEvidenceAnchor).join(" | ")}.`
    : "No additional hidden-risk citation anchors were provided.";
  const downgradeLine = reconciled.last_disposition_downgrade_by === "clinical_intelligence_mcp"
    ? "Clinical Intelligence MCP caused the last disposition downgrade."
    : reconciled.last_disposition_downgrade_by === "discharge_gatekeeper_mcp"
    ? "Discharge Gatekeeper MCP remains the last downgrade source."
    : "No downgrade beyond the deterministic baseline was required.";
  return `${promptPayload.headline} Hidden-risk review status: ${reconciled.hidden_risk_run_status}. Top blocker categories: ${categories}. ${downgradeLine} ${evidenceLine} This is assistive discharge decision support and does not replace clinician authority.`;
};

const renderPrompt2Narrative = (
  reconciled: ReconciliationResult,
  promptPayload: ReconciliationResult["prompt_payload"],
): string => {
  const evidenceLine = promptPayload.evidence_anchors.length > 0
    ? `Evidence first: ${promptPayload.evidence_anchors.map(toEvidenceAnchor).join(" | ")}.`
    : "No contradiction citation anchors were available.";
  const impactedCategories = promptPayload.impacted_blocker_categories.slice(0, 3).join(", ") || "none";
  const manualReviewLine = reconciled.manual_review_required
    ? "Manual clinician review is required before final discharge because hidden-risk uncertainty remains unresolved."
    : "No additional matrix-level manual-review flag is set.";
  return `${promptPayload.headline} ${reconciled.contradiction_summary} ${evidenceLine} Impacted blocker categories: ${impactedCategories}. ${manualReviewLine} This is assistive discharge decision support and does not replace clinician authority.`;
};

const renderPrompt3Narrative = (
  reconciled: ReconciliationResult,
  promptPayload: ReconciliationResult["prompt_payload"],
): string => {
  const prioritizedSteps = promptPayload.action_plan
    .map((step, index) => {
      const leadingAnchor = step.citation_anchors[0];
      const anchorText = leadingAnchor ? ` Evidence: ${toEvidenceAnchor(leadingAnchor)}.` : "";
      return `${index + 1}. ${step.owner} | ${step.timing} | ${step.action}${anchorText}`;
    })
    .join(" ");
  const actionLine = prioritizedSteps.length > 0
    ? `Before discharge, complete: ${prioritizedSteps}`
    : "Before discharge, complete the deterministic transition safeguards and confirm no unresolved blockers remain.";
  const clinicianLine = promptPayload.clinician_handoff_brief
    ? `Clinician handoff: ${promptPayload.clinician_handoff_brief}`
    : "";
  const patientLine = promptPayload.patient_discharge_guidance
    ? `Patient guidance: ${promptPayload.patient_discharge_guidance}`
    : "";
  return `${promptPayload.headline} ${actionLine} ${clinicianLine} ${patientLine} Final posture remains ${reconciled.final_verdict}. This is assistive discharge decision support and does not replace clinician authority.`;
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
): {
  prompt_used: string;
  narrative: string;
  prompt_payload: ReconciliationResult["prompt_payload"];
} => {
  if (process.env["A2A_FORCE_SYNTHESIS_ERROR"] === "1") {
    throw new Error("A2A synthesis forced failure");
  }

  const prompt = buildSynthesisPrompt(taskInput, reconciled);
  const promptPayload = buildPromptPayload(taskInput, reconciled);

  let narrative: string;
  if (promptPayload.prompt_mode === "prompt_2") {
    narrative = renderPrompt2Narrative(reconciled, promptPayload);
  } else if (promptPayload.prompt_mode === "prompt_3") {
    narrative = renderPrompt3Narrative(reconciled, promptPayload);
  } else {
    narrative = renderPrompt1Narrative(reconciled, promptPayload);
  }

  return {
    prompt_used: prompt,
    narrative,
    prompt_payload: promptPayload,
  };
};
