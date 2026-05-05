import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Request } from "express";
import { z } from "zod";
import { IMcpTool } from "../IMcpTool";
import { McpUtilities } from "../mcp-utilities";
import {
  assessReconciledDischargeReadiness,
  DEFAULT_RECONCILED_SCENARIO_ID,
} from "../clinical-intelligence/reconciled-discharge-readiness";

export const ASSESS_RECONCILED_DISCHARGE_READINESS_TOOL_DESCRIPTION =
  "Prompt 1 Direct-MCP reconciled readiness tool. Use when asked whether the canonical trap patient is safe to discharge today. It composes the Discharge Gatekeeper deterministic structured baseline with Clinical Intelligence hidden-risk narrative review, preserves baseline ready, and returns final not_ready with evidence anchors. Prefer this over baseline-only assess_discharge_readiness for Prompt 1.";

const inputSchema = {
  scenario_id: z
    .literal(DEFAULT_RECONCILED_SCENARIO_ID)
    .default(DEFAULT_RECONCILED_SCENARIO_ID)
    .describe("Canonical Prompt Opinion trap patient scenario id."),
  response_mode: z
    .enum(["prompt_opinion_slim", "full"])
    .default("prompt_opinion_slim")
    .describe("Use prompt_opinion_slim for compact Prompt Opinion transcript output."),
};

const toolInputSchema = z.object(inputSchema);

class AssessReconciledDischargeReadinessTool implements IMcpTool {
  registerTool(server: McpServer, _req: Request): void {
    server.registerTool(
      "assess_reconciled_discharge_readiness",
      {
        description: ASSESS_RECONCILED_DISCHARGE_READINESS_TOOL_DESCRIPTION,
        inputSchema,
      },
      async (rawInput) => {
        try {
          const parsed = toolInputSchema.safeParse(rawInput);
          if (!parsed.success) {
            throw new Error(
              `Invalid input for assess_reconciled_discharge_readiness: ${parsed.error.message}`,
            );
          }

          const payload = await assessReconciledDischargeReadiness({
            responseMode: parsed.data.response_mode,
          });
          return McpUtilities.createTextResponse(JSON.stringify(payload, null, 2), {
            isError: payload.status === "error",
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return McpUtilities.createTextResponse(
            JSON.stringify(
              {
                contract_version: "phase8_6_reconciled_readiness_v1",
                status: "error",
                message: `assess_reconciled_discharge_readiness invocation failed: ${message}`,
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

export const AssessReconciledDischargeReadinessToolInstance =
  new AssessReconciledDischargeReadinessTool();
