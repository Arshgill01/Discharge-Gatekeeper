import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Request } from "express";
import { z } from "zod";
import { IMcpTool } from "../IMcpTool";
import { McpUtilities } from "../mcp-utilities";
import { HiddenRiskOutput } from "../clinical-intelligence/contract";
import { surfaceHiddenRisks } from "../clinical-intelligence/surface-hidden-risks";
import {
  DEFAULT_HIDDEN_RISK_SCENARIO_ID,
  resolveHiddenRiskToolInput,
} from "./canonical-hidden-risk-input";

export const SURFACE_HIDDEN_RISKS_TOOL_DESCRIPTION =
  "Prompt 2 compact hidden-risk contradiction for the canonical trap patient. Call with scenario_id only; returns concise evidence anchors.";

const inputSchema = {
  scenario_id: z
    .literal(DEFAULT_HIDDEN_RISK_SCENARIO_ID)
    .default(DEFAULT_HIDDEN_RISK_SCENARIO_ID)
    .describe("Canonical Prompt Opinion trap patient scenario id."),
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

          const hiddenRiskInput = resolveHiddenRiskToolInput(
            parsed.data,
            "Prompt 2 Direct-MCP hidden-risk contradiction review using compact canonical scenario input.",
          );
          const { payload } = await surfaceHiddenRisks(hiddenRiskInput, {
            responseMode: "prompt_opinion_slim",
          });
          const isError = payload.status === "error";
          return {
            content: [
              {
                type: "text",
                text: formatPromptOpinionSlimHiddenRisk(payload),
              },
            ],
            isError,
          };
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
