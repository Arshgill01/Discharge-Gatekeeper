import { CallToolResult } from "@modelcontextprotocol/sdk/types";

const REQUIRED_EVIDENCE_ANCHORS = [
  "Nursing Note 2026-04-18 20:40",
  "Case Management Addendum 2026-04-18 20:55",
] as const;

const REQUIRED_BLOCKER_CATEGORIES = [
  "clinical_stability",
  "equipment_and_transport",
  "home_support_and_services",
] as const;

type ResponseMode = "prompt_opinion_slim" | "full";

export const buildReconciledPromptOneToolResult = async (
  responseMode: ResponseMode,
): Promise<CallToolResult> => {
  const { assessReconciledDischargeReadiness } = await import(
    "../../clinical-intelligence-typescript/clinical-intelligence/reconciled-discharge-readiness"
  );
  const payload = await assessReconciledDischargeReadiness({
    responseMode,
  });

  if (responseMode === "prompt_opinion_slim") {
    return {
      content: [
        {
          type: "text",
          text: payload.prompt_opinion_visible_answer,
        },
      ],
      structuredContent: {
        final_verdict: payload.final_verdict,
        structured_baseline_posture: payload.structured_posture,
        hidden_risk_review_status: payload.clinical_intelligence_status,
        hidden_risk_result: payload.hidden_risk_result,
        narrative_source_count: payload.narrative_source_count,
        evidence_anchors: REQUIRED_EVIDENCE_ANCHORS,
        blocker_categories: REQUIRED_BLOCKER_CATEGORIES,
      },
      isError: payload.status === "error",
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2),
      },
    ],
    isError: payload.status === "error",
  };
};
