import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Request } from "express";
import { z } from "zod";
import { IMcpTool } from "../IMcpTool";
import { McpUtilities } from "../mcp-utilities";
import {
  HiddenRiskOutput,
  deterministicSnapshotSchema,
  fhirContextSchema,
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
  fhir_context: fhirContextSchema
    .optional()
    .describe("Optional FHIR-native context envelope carrying resource references and narrative provenance."),
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
  const evidenceLines = payload.citations
    .slice(0, 4)
    .map((citation) => {
      const prefix = citation.fhir_reference ? `${citation.fhir_reference} | ` : "";
      return `- ${prefix}${citation.source_label}: ${citation.excerpt}`;
    });
  const rawReferences = [...new Set(payload.citations.map((citation) => citation.fhir_reference).filter(Boolean))];

  return [
    "HIDDEN CONTRADICTION REVIEW",
    "",
    `Structured baseline: ${payload.baseline_verdict.toUpperCase()}`,
    `Narrative result: ${payload.hidden_risk_summary.result.toUpperCase()}`,
    "",
    "Why this changes the answer:",
    payload.hidden_risk_summary.summary,
    "",
    "Controlling evidence:",
    ...(evidenceLines.length > 0 ? evidenceLines : ["- none"]),
    `Raw FHIR references: ${rawReferences.length > 0 ? rawReferences.join(" | ") : "none"}.`,
    `Impacted categories: ${categories.join(", ") || "none"}.`,
    "Final disposition remains with the clinical team.",
  ].join("\n");
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
