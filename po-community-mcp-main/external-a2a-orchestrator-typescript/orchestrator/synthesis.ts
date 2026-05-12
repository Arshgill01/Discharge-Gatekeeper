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
  if (
    normalized.includes("re-arbitrate") ||
    normalized.includes("rearbitrate") ||
    normalized.includes("update discharge status") ||
    normalized.includes("update readiness")
  ) {
    return "prompt_4";
  }
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

const compactSentence = (value: string, maxLength: number = 180): string => {
  const compacted = value
    .replace(/\s+/g, " ")
    .replace(/\s+\[[^\]]+\](?=\s|$)/g, "")
    .trim();
  return compacted.length > maxLength
    ? `${compacted.slice(0, maxLength - 3).trimEnd()}...`
    : compacted;
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
    fhir_reference: citation.fhir_reference,
    fhir_resource_type: citation.fhir_resource_type,
    fhir_resource_id: citation.fhir_resource_id,
  }));
  const deterministicAnchors = reconciled.citations.deterministic.map((citation) => ({
    id: citation.id,
    source: "deterministic" as const,
    source_label: citation.source_label,
    detail: citation.detail,
    fhir_reference: citation.fhir_reference,
    fhir_resource_type: citation.fhir_resource_type,
    fhir_resource_id: citation.fhir_resource_id,
  }));

  if (promptMode === "prompt_3") {
    const actionAnchors = reconciled.merged_next_steps.flatMap((step) => step.citation_anchors);
    return selectDistinctEvidenceAnchors(actionAnchors).slice(0, 4);
  }

  if (hiddenRiskAnchors.length > 0) {
    return selectDistinctEvidenceAnchors(hiddenRiskAnchors).slice(0, promptMode === "prompt_2" ? 3 : 2);
  }

  if (deterministicAnchors.length > 0) {
    return selectDistinctEvidenceAnchors(deterministicAnchors).slice(0, 2);
  }

  const fhirReadAnchors = (reconciled.deterministic.fhir_context?.fhir_resources_read ?? [])
    .slice(0, 2)
    .map((resource, index) => ({
      id: `fhir-read-${index + 1}`,
      source: "deterministic" as const,
      source_label: resource.summary,
      detail: resource.summary,
      fhir_reference: resource.reference,
      fhir_resource_type: resource.resource_type,
      fhir_resource_id: resource.resource_id,
    }));

  if (fhirReadAnchors.length > 0) {
    return selectDistinctEvidenceAnchors(fhirReadAnchors);
  }

  const patientReference = reconciled.deterministic.fhir_context?.patient_reference;
  if (!patientReference) {
    return [];
  }

  const [resourceType, resourceId] = patientReference.split("/");
  return [
    {
      id: "patient-reference-fallback",
      source: "deterministic" as const,
      source_label: patientReference,
      detail: patientReference,
      fhir_reference: patientReference,
      fhir_resource_type: resourceType,
      fhir_resource_id: resourceId,
    },
  ];
};

const buildReferenceList = (
  references: Array<string | undefined>,
  fallback: string = "none",
): string => {
  const unique = [...new Set(references.filter((reference): reference is string => Boolean(reference)))];
  return unique.length > 0 ? unique.join(" | ") : fallback;
};

const compactVisibleAction = (value: string, maxLength: number = 110): string => {
  const condensed = value
    .replace(/^Immediate discharge hold action:\s*/i, "")
    .replace(/^Before final discharge order:\s*/i, "")
    .replace(/\s+Completion signal:.*$/i, "")
    .replace(/\s+Evidence:.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return condensed.length > maxLength ? `${condensed.slice(0, maxLength - 3).trimEnd()}...` : condensed;
};

const buildImpactedCategories = (reconciled: ReconciliationResult): string[] => {
  const categories = reconciled.hidden_risk?.status === "ok" &&
      reconciled.hidden_risk.hidden_risk_findings.length > 0
    ? reconciled.hidden_risk.hidden_risk_findings.map((finding) => finding.category)
    : reconciled.merged_blockers.map((blocker) => blocker.category);

  return [...new Set(categories)];
};

const buildControllingEvidenceLines = (
  reconciled: ReconciliationResult,
  limit: number,
): string[] => {
  const evidence = reconciled.transition_safety_packet.controlling_evidence.length > 0
    ? reconciled.transition_safety_packet.controlling_evidence
    : reconciled.transition_safety_packet.narrative_evidence;

  return evidence.slice(0, limit).map((item) => {
    const label = item.timestamp
      ? `${item.resource_type} ${item.timestamp}`
      : `${item.resource_type}/${item.resource_id}`;
    return `- ${compactSentence(item.summary, 120)} [${item.reference}] ${label}`;
  });
};

const buildControllingFhirReferenceLine = (
  reconciled: ReconciliationResult,
): string => {
  const evidence = reconciled.transition_safety_packet.controlling_evidence.length > 0
    ? reconciled.transition_safety_packet.controlling_evidence
    : reconciled.transition_safety_packet.narrative_evidence;
  return `Raw FHIR references: ${buildReferenceList(evidence.map((item) => item.reference))}.`;
};

const buildWrittenTaskRows = (reconciled: ReconciliationResult): string[] => {
  return reconciled.transition_safety_packet.fhir_resources_written
    .filter((resource) => resource.resource_type === "Task")
    .slice(0, 6)
    .map((resource) => {
      const reasons = buildReferenceList(resource.linked_evidence_references ?? []);
      return `- ${resource.reference}: ${compactSentence(resource.summary, 110)} (reason: ${reasons})`;
    });
};

const buildAuditRows = (reconciled: ReconciliationResult): string[] => {
  return reconciled.transition_safety_packet.fhir_resources_written
    .filter((resource) => resource.resource_type === "AuditEvent" || resource.resource_type === "Provenance")
    .slice(0, 4)
    .map((resource) => `- ${resource.reference}: ${compactSentence(resource.summary, 100)}`);
};

const toBulletList = (values: string[]): string[] =>
  values.length > 0 ? values.map((value) => `- ${value}`) : ["- none"];

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

  if (promptMode === "prompt_4") {
    return `Re-arbitrated discharge status: ${reconciled.final_verdict}.`;
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
  if (!leadingStep) {
    return undefined;
  }
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
  if (
    promptPayload.prompt_mode === "prompt_4" ||
    reconciled.transition_safety_packet.resolution_evidence.length > 0
  ) {
    const previousStatusMatch = reconciled.contradiction_summary.match(/Previous status ([a-z_]+)/i);
    const resolvedGates = [
      ...new Set(
        reconciled.transition_safety_packet.resolution_evidence.flatMap((item) => item.supports),
      ),
    ];
    const remainingGates = reconciled.transition_safety_packet.reconciled_transition_status.blocker_categories;
    const resolutionRefs = reconciled.transition_safety_packet.resolution_evidence
      .map((item) => item.reference)
      .filter(Boolean);
    const taskRows = buildWrittenTaskRows(reconciled);
    const auditRows = buildAuditRows(reconciled);
    return [
      "DISCHARGE STATUS UPDATE",
      "",
      `Previous status: ${(previousStatusMatch?.[1] ?? "unknown").toUpperCase()}`,
      `Updated status: ${reconciled.final_verdict.toUpperCase()}`,
      "",
      "Resolved gates:",
      ...toBulletList(resolvedGates),
      "",
      "Remaining unresolved gates:",
      ...toBulletList(remainingGates),
      "",
      "Why discharge is still held:",
      compactSentence(reconciled.transition_safety_packet.reconciled_transition_status.why_changed, 240),
      "",
      `Resolution evidence: ${buildReferenceList(resolutionRefs)}`,
      ...(taskRows.length > 0 ? ["", "FHIR Task ledger:", ...taskRows] : []),
      ...(auditRows.length > 0 ? ["", "Audit proof:", ...auditRows] : []),
      "This is assistive discharge decision support and does not replace clinician authority.",
    ].join("\n");
  }

  const evidenceLines = buildControllingEvidenceLines(reconciled, 3);
  const taskRows = buildWrittenTaskRows(reconciled);
  const auditRows = buildAuditRows(reconciled);
  const hiddenRiskLine = reconciled.hidden_risk_result === "hidden_risk_present"
    ? "Clinical Intelligence found cited narrative evidence that changes the structured baseline."
    : "No discharge-changing hidden risk was confirmed.";
  const statusExplanationHeader =
    reconciled.final_verdict === "ready"
      ? "Why discharge can proceed to clinician review:"
      : "Why discharge is held:";
  return [
    `DISCHARGE STATUS: ${reconciled.final_verdict.toUpperCase()}`,
    "",
    `Structured baseline: ${reconciled.deterministic.verdict.toUpperCase()}`,
    `Hidden-risk result: ${reconciled.hidden_risk_result.toUpperCase()}`,
    "",
    statusExplanationHeader,
    compactSentence(reconciled.transition_safety_packet.reconciled_transition_status.why_changed, 240),
    hiddenRiskLine,
    "",
    "Hidden contradiction evidence:",
    ...(evidenceLines.length > 0 ? evidenceLines : ["- none"]),
    buildControllingFhirReferenceLine(reconciled),
    "",
    "Blocking FHIR work:",
    ...(taskRows.length > 0 ? taskRows : ["- none", "Written FHIR Tasks: none."]),
    ...(auditRows.length > 0 ? ["", "Audit proof:", ...auditRows] : []),
    "This is assistive discharge decision support and does not replace clinician authority.",
  ].join("\n");
};

const renderPrompt2Narrative = (
  reconciled: ReconciliationResult,
): string => {
  const evidenceLines = buildControllingEvidenceLines(reconciled, 4);
  const taskRows = buildWrittenTaskRows(reconciled);
  return [
    "HIDDEN CONTRADICTION REVIEW",
    "",
    `Structured baseline: ${reconciled.deterministic.verdict.toUpperCase()}`,
    `Narrative result: ${reconciled.hidden_risk_result.toUpperCase()}`,
    "",
    "Structured chart looked ready because:",
    compactSentence(reconciled.deterministic.summary, 180),
    "",
    "Why that answer changed:",
    compactSentence(reconciled.transition_safety_packet.narrative_review.contradiction_summary, 240),
    "",
    "Contradicting evidence:",
    ...evidenceLines,
    buildControllingFhirReferenceLine(reconciled),
    "",
    `FHIR references: ${buildReferenceList(evidenceLines.map((line) => line.match(/\[(.*?)\]/)?.[1]))}`,
    ...(taskRows.length > 0 ? ["", "Blocking FHIR Tasks:", ...taskRows] : []),
    ...(reconciled.manual_review_required
      ? ["Manual clinician review is required before discharge proceeds."]
      : []),
    `Final transition status: ${reconciled.final_verdict.toUpperCase()}`,
    "This is assistive discharge decision support and does not replace clinician authority.",
  ].join("\n");
};

const renderPrompt3Narrative = (
  reconciled: ReconciliationResult,
  promptPayload: ReconciliationResult["prompt_payload"],
): string => {
  const taskRows = buildWrittenTaskRows(reconciled);
  const prioritizedSteps = taskRows.length > 0
    ? taskRows.map((line, index) => `${index + 1}. ${line.replace(/^-\s*/, "")}`).join("\n")
    : promptPayload.action_plan
        .filter((step) => step.source === "hidden_risk")
        .concat(promptPayload.action_plan.filter((step) => step.source !== "hidden_risk"))
        .slice(0, 4)
        .map((step, index) => {
          const leadingAnchor = step.citation_anchors[0];
          const anchorText = leadingAnchor
            ? ` [${leadingAnchor.fhir_reference ?? leadingAnchor.source_label}]`
            : "";
          return `${index + 1}. ${step.owner} - ${compactVisibleAction(step.action)}${anchorText}`;
        })
        .join("\n");
  const clinicianLine = promptPayload.clinician_handoff_brief
    ? `Clinician handoff: ${promptPayload.clinician_handoff_brief}`
    : "";
  const patientLine = promptPayload.patient_discharge_guidance
    ? `Patient guidance: ${promptPayload.patient_discharge_guidance}`
    : "";
  const evidenceLines = buildControllingEvidenceLines(reconciled, 4);
  const auditRows = buildAuditRows(reconciled);
  return [
    reconciled.final_verdict === "not_ready"
      ? "TRANSITION PACKAGE - DISCHARGE HOLD ACTIVE"
      : "TRANSITION PACKAGE",
    "",
    "Release condition:",
    reconciled.final_verdict === "not_ready"
      ? "Do not discharge until the cited blocking gates are resolved and clinician review confirms a safe transition."
      : "Complete the cited actions and clinician review before final discharge release.",
    "",
    "Actions:",
    prioritizedSteps.length > 0
      ? prioritizedSteps
      : "1. No additional owner-assigned actions were generated.",
    "",
    "Evidence:",
    ...evidenceLines,
    buildControllingFhirReferenceLine(reconciled),
    `FHIR references: ${buildReferenceList(evidenceLines.map((line) => line.match(/\[(.*?)\]/)?.[1]))}`,
    ...(auditRows.length > 0 ? ["", "Audit proof:", ...auditRows] : []),
    ...(clinicianLine ? ["", clinicianLine] : []),
    ...(patientLine ? [patientLine] : []),
    `Final posture: ${reconciled.final_verdict.toUpperCase()}`,
    "This is assistive discharge decision support and does not replace clinician authority.",
  ].join("\n");
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
    narrative = renderPrompt2Narrative(reconciled);
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
