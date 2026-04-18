import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Request } from "express";
import { z } from "zod";
import { IMcpTool } from "../IMcpTool";
import { McpUtilities } from "../mcp-utilities";
import {
  GENERATE_TRANSITION_PLAN_TOOL_NAME,
  V1_SUPPORTED_SCENARIO_IDS,
} from "../discharge-readiness/contract";
import {
  isSupportedScenarioId,
} from "../discharge-readiness/scenario-selection";
import { generateTransitionPlan } from "../discharge-readiness/generate-transition-plan";
import { resolveWorkflowInputForRequest } from "../discharge-readiness/live-context";

class GenerateTransitionPlanTool implements IMcpTool {
  registerTool(server: McpServer, req: Request) {
    server.registerTool(
      GENERATE_TRANSITION_PLAN_TOOL_NAME,
      {
        description:
          "Generate prioritized transition tasks linked to blockers and evidence on the shared discharge workflow spine.",
        inputSchema: {
          scenario_id: z
            .string()
            .describe(
              "Optional scenario identifier. Defaults to first_synthetic_discharge_slice_v1. Supported IDs include first_synthetic_discharge_slice_v1, second_synthetic_discharge_slice_ready_with_caveats_v1, and third_synthetic_discharge_slice_ready_v1.",
            )
            .optional(),
        },
      },
      async ({ scenario_id }) => {
        if (scenario_id && !isSupportedScenarioId(scenario_id)) {
          return McpUtilities.createTextResponse(
            `Unsupported scenario_id '${scenario_id}'. Supported values: '${V1_SUPPORTED_SCENARIO_IDS.join("', '")}'.`,
            { isError: true },
          );
        }

        const { input } = await resolveWorkflowInputForRequest(req, {
          scenarioId: scenario_id,
        });
        const response = generateTransitionPlan(input);
        return McpUtilities.createTextResponse(JSON.stringify(response, null, 2));
      },
    );
  }
}

export const GenerateTransitionPlanToolInstance =
  new GenerateTransitionPlanTool();
