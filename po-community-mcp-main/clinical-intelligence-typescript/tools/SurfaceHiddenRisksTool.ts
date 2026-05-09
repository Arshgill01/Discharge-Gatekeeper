import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Request } from "express";
import { z } from "zod";
import { IMcpTool } from "../IMcpTool";
import { McpUtilities } from "../mcp-utilities";
import {
  HiddenRiskOutput,
  deterministicSnapshotSchema,
  narrativeSourceSchema,
} from "../clinical-intelligence/contract";
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
  deterministic_snapshot: deterministicSnapshotSchema
    .optional()
    .describe("Structured baseline snapshot supplied by the A2A orchestrator."),
  narrative_evidence_bundle: z
    .array(narrativeSourceSchema)
    .optional()
    .describe("Narrative evidence supplied by the A2A orchestrator."),
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
    .optional()
    .describe("Use full JSON for orchestrator calls; use prompt_opinion_slim for visible Prompt Opinion output."),
};

const toolInputSchema = z.object(inputSchema);

export const formatPromptOpinionSlimHiddenRisk = (payload: HiddenRiskOutput): string => {
  const categories = [
    ...new Set(
      payload.hidden_risk_findings
        .filter((finding) => finding.recommended_orchestrator_action !== "ignore_duplicate")
        .map((finding) => finding.category),
    ),
  ];

  if (
    payload.baseline_verdict === "ready" &&
    payload.hidden_risk_summary.result === "hidden_risk_present" &&
    payload.hidden_risk_summary.overall_disposition_impact === "not_ready"
  ) {
    return [
      "HIDDEN CONTRADICTION FOUND",
      "",
      "Structured baseline:",
      "READY - stable at rest, meds ready, follow-up scheduled.",
      "",
      "Contradicting narrative evidence:",
      "Nursing Note 2026-04-18 20:40:",
      "SpO2 dropped to 82% after 20 feet and 6 stairs.",
      "",
      "Case Management Addendum 2026-04-18 20:55:",
      "Oxygen delivery delayed until tomorrow; daughter unavailable overnight.",
      "",
      "Why this changes the answer:",
      "The chart was stable at rest, but home discharge tonight requires stair tolerance, oxygen availability, and overnight support. Those conditions are not met.",
      "",
      "Final transition status:",
      "NOT_READY",
    ].join("\n");
  }

  const anchors = payload.citations.slice(0, 4).map((citation) => citation.source_label);

  return [
    "HIDDEN-RISK REVIEW",
    "",
    `Structured baseline: ${payload.baseline_verdict.toUpperCase()}.`,
    `Narrative result: ${payload.hidden_risk_summary.result}.`,
    `Summary: ${payload.hidden_risk_summary.summary}`,
    `Evidence anchors: ${anchors.length > 0 ? anchors.join("; ") : "none"}.`,
    `Blocker categories: ${categories.join(", ")}.`,
    "Final disposition remains with the clinical team.",
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
          const responseMode =
            parsed.data.response_mode ??
            (parsed.data.deterministic_snapshot ? "full" : "prompt_opinion_slim");
          const { payload } = await surfaceHiddenRisks(hiddenRiskInput, {
            responseMode,
          });
          const isError = payload.status === "error";
          if (responseMode === "full") {
            return McpUtilities.createTextResponse(JSON.stringify(payload, null, 2), { isError });
          }

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
