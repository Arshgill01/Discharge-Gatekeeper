import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Request } from "express";
import { z } from "zod";
import { IMcpTool } from "../IMcpTool";
import { McpUtilities } from "../mcp-utilities";
import { CANONICAL_BLOCKER_CATEGORIES, CANONICAL_VERDICTS } from "../clinical-intelligence/contract";
import { HiddenRiskOutput } from "../clinical-intelligence/contract";
import { surfaceHiddenRisks } from "../clinical-intelligence/surface-hidden-risks";

export const SURFACE_HIDDEN_RISKS_TOOL_DESCRIPTION =
  "Prompt 2 tool for contradiction-first hidden-risk review. Use when asked what hidden risk changed the discharge answer and to show note-backed evidence. Do not use this for deterministic baseline-only Prompt 1 or transition-package Prompt 3 synthesis.";

const inputSchema = {
  deterministic_snapshot: z.object({
    patient_id: z.string().nullable().optional(),
    encounter_id: z.string().nullable().optional(),
    baseline_verdict: z.enum(CANONICAL_VERDICTS),
    deterministic_blockers: z
      .array(
        z.object({
          blocker_id: z.string(),
          category: z.enum(CANONICAL_BLOCKER_CATEGORIES),
          description: z.string(),
          severity: z.enum(["low", "medium", "high"]).optional(),
        }),
      )
      .default([]),
    deterministic_evidence: z
      .array(
        z.object({
          evidence_id: z.string().optional(),
          source_label: z.string(),
          detail: z.string().optional(),
        }),
      )
      .default([]),
    deterministic_next_steps: z.array(z.string()).default([]),
    deterministic_summary: z.string(),
  }),
  narrative_evidence_bundle: z
    .array(
      z.object({
        source_id: z.string(),
        source_type: z.string(),
        source_label: z.string(),
        locator: z.string().optional(),
        timestamp: z.string().optional(),
        excerpt: z.string(),
      }),
    )
    .default([]),
  optional_context_metadata: z
    .object({
      care_setting: z.string().optional(),
      discharge_destination: z.string().optional(),
      reviewer_timestamp: z.string().optional(),
      explicit_task_goal: z.string().optional(),
    })
    .optional(),
  response_mode: z
    .enum(["prompt_opinion_slim", "full"])
    .default("prompt_opinion_slim")
    .describe(
      "Optional output mode. Use prompt_opinion_slim for compact transcript-safe payloads in Prompt Opinion. Use full for full-fidelity debugging.",
    ),
};

const toolInputSchema = z.object(inputSchema);

const formatPromptOpinionSlimHiddenRisk = (payload: HiddenRiskOutput): string => {
  const categories = [
    ...new Set(
      payload.hidden_risk_findings
        .filter((finding) => finding.recommended_orchestrator_action !== "ignore_duplicate")
        .map((finding) => finding.category),
    ),
  ];
  const anchors = payload.citations
    .slice(0, 4)
    .map((citation) => citation.source_label)
    .join("; ");
  const topFinding = payload.hidden_risk_findings[0];
  const contradiction = topFinding
    ? `${topFinding.title}: ${topFinding.rationale}`
    : payload.hidden_risk_summary.summary;

  return [
    `Structured baseline posture: ${payload.baseline_verdict}.`,
    `Hidden-risk review status: ${payload.status}; result=${payload.hidden_risk_summary.result}; final impact=${payload.hidden_risk_summary.overall_disposition_impact}.`,
    `Contradiction: ${contradiction}`,
    `Evidence anchors: ${anchors}.`,
    `Blocker categories: ${categories.join(", ")}.`,
    `Disposition change: hold as not_ready when hidden-risk impact is not_ready; final disposition remains with the clinical team.`,
  ].join(" ");
};

class SurfaceHiddenRisksTool implements IMcpTool {
  registerTool(server: McpServer, _req: Request): void {
    server.registerTool(
      "surface_hidden_risks",
      {
        description: SURFACE_HIDDEN_RISKS_TOOL_DESCRIPTION,
        annotations: {
          readOnlyHint: true,
        },
        inputSchema,
      },
      async (rawInput) => {
        try {
          const parsed = toolInputSchema.safeParse(rawInput);
          if (!parsed.success) {
            throw new Error(`Invalid input for surface_hidden_risks: ${parsed.error.message}`);
          }

          const { response_mode } = parsed.data;
          const { payload } = await surfaceHiddenRisks(parsed.data, {
            responseMode: response_mode,
          });
          const isError = payload.status === "error";
          if (response_mode === "prompt_opinion_slim") {
            const categories = [
              ...new Set(
                payload.hidden_risk_findings
                  .filter((finding) => finding.recommended_orchestrator_action !== "ignore_duplicate")
                  .map((finding) => finding.category),
              ),
            ];
            return {
              content: [
                {
                  type: "text",
                  text: formatPromptOpinionSlimHiddenRisk(payload),
                },
              ],
              structuredContent: {
                baseline_verdict: payload.baseline_verdict,
                hidden_risk_review_status: payload.status,
                hidden_risk_result: payload.hidden_risk_summary.result,
                final_impact: payload.hidden_risk_summary.overall_disposition_impact,
                evidence_anchors: payload.citations
                  .slice(0, 4)
                  .map((citation) => citation.source_label),
                blocker_categories: categories,
              },
              isError,
            };
          }
          return McpUtilities.createTextResponse(JSON.stringify(payload, null, 2), { isError });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return McpUtilities.createTextResponse(
            JSON.stringify(
              {
                contract_version: "phase0_hidden_risk_v1",
                status: "error",
                message: `surface_hidden_risks invocation failed: ${message}`,
              },
              null,
              2,
            ),
            { isError: true },
          );
        }
      },
    );
  }
}

export const SurfaceHiddenRisksToolInstance = new SurfaceHiddenRisksTool();
