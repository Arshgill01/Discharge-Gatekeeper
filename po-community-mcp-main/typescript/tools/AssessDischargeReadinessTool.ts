import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Request } from "express";
import { z } from "zod";
import { IMcpTool } from "../IMcpTool";
import { McpUtilities } from "../mcp-utilities";
import { assessDischargeReadinessV1 } from "../discharge-readiness/assess-discharge-readiness";
import {
  V1_SCENARIO_3_ID,
  V1_SUPPORTED_SCENARIO_IDS,
  V1_TOOL_NAME,
} from "../discharge-readiness/contract";
import {
  isSupportedScenarioId,
} from "../discharge-readiness/scenario-selection";
import { resolveWorkflowInputForRequest } from "../discharge-readiness/live-context";

const DEFAULT_RESPONSE_MODE = "prompt_opinion_slim";

const shouldUseReconciledPromptOne = (
  scenarioId: string | undefined,
  readinessMode: "reconciled_prompt_one" | "deterministic_structured_baseline" | undefined,
): boolean => {
  if (!scenarioId || scenarioId === V1_SCENARIO_3_ID) {
    return true;
  }

  return readinessMode === "reconciled_prompt_one";
};

class AssessDischargeReadinessTool implements IMcpTool {
  registerTool(server: McpServer, req: Request) {
    server.registerTool(
      V1_TOOL_NAME,
      {
        description:
          "Prompt 1 readiness tool for Care Transitions Command. For the canonical trap patient or omitted scenario_id, answer exactly from the tool result: final discharge verdict not_ready, structured baseline posture ready, hidden-risk review status ok, with cited Nursing Note and Case Management evidence. Use deterministic_structured_baseline only when explicitly asking for DGK-only structured output.",
        inputSchema: {
          scenario_id: z
            .string()
            .describe(
              "Optional fixture scenario id. Defaults to the canonical Prompt Opinion trap patient for reconciled Prompt 1.",
            )
            .optional(),
          readiness_mode: z
            .enum(["reconciled_prompt_one", "deterministic_structured_baseline"])
            .optional()
            .describe(
              "Use reconciled_prompt_one to force the Prompt Opinion demo answer for non-canonical fixtures; canonical Prompt 1 always reconciles even if this is omitted.",
            ),
          response_mode: z
            .enum(["prompt_opinion_slim", "full"])
            .default(DEFAULT_RESPONSE_MODE)
            .describe("Use prompt_opinion_slim for compact Prompt Opinion transcript output."),
        },
      },
      async ({ scenario_id, readiness_mode, response_mode }) => {
        if (scenario_id && !isSupportedScenarioId(scenario_id)) {
          return McpUtilities.createTextResponse(
            `Unsupported scenario_id '${scenario_id}'. Supported values: '${V1_SUPPORTED_SCENARIO_IDS.join("', '")}'.`,
            { isError: true },
          );
        }

        if (shouldUseReconciledPromptOne(scenario_id, readiness_mode)) {
          const { assessReconciledDischargeReadiness } = await import(
            "../../clinical-intelligence-typescript/clinical-intelligence/reconciled-discharge-readiness"
          );
          const payload = await assessReconciledDischargeReadiness({
            responseMode: response_mode ?? DEFAULT_RESPONSE_MODE,
          });
          if ((response_mode ?? DEFAULT_RESPONSE_MODE) === "prompt_opinion_slim") {
            return McpUtilities.createTextResponse(payload.prompt_opinion_visible_answer, {
              isError: payload.status === "error",
            });
          }

          return McpUtilities.createTextResponse(JSON.stringify(payload, null, 2), {
            isError: payload.status === "error",
          });
        }

        const { input } = await resolveWorkflowInputForRequest(req, {
          scenarioId: scenario_id,
        });
        const response = assessDischargeReadinessV1(input);
        return McpUtilities.createTextResponse(JSON.stringify(response, null, 2));
      },
    );
  }
}

export const AssessDischargeReadinessToolInstance =
  new AssessDischargeReadinessTool();
