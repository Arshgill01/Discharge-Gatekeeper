import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Request } from "express";
import { z } from "zod";
import { IMcpTool } from "../IMcpTool";
import { McpUtilities } from "../mcp-utilities";
import { buildClinicianHandoffBriefV1 } from "../discharge-readiness/workflow-artifacts";
import {
  V1_CLINICIAN_HANDOFF_TOOL_NAME,
  V1_SUPPORTED_SCENARIO_IDS,
} from "../discharge-readiness/contract";
import {
  isSupportedScenarioId,
  resolveScenarioInput,
} from "../discharge-readiness/scenario-selection";

class BuildClinicianHandoffBriefTool implements IMcpTool {
  registerTool(server: McpServer, _req: Request) {
    server.registerTool(
      V1_CLINICIAN_HANDOFF_TOOL_NAME,
      {
        description:
          "Builds an assistive clinician handoff brief with unresolved risks, blocker-linked actions, and explicit review boundaries.",
        inputSchema: {
          scenario_id: z
            .string()
            .describe(
              "Optional scenario identifier. Defaults to first_synthetic_discharge_slice_v1. Supported IDs include first_synthetic_discharge_slice_v1 and second_synthetic_discharge_slice_ready_with_caveats_v1.",
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

        const selectedScenario = resolveScenarioInput(scenario_id);
        const response = buildClinicianHandoffBriefV1(selectedScenario);
        return McpUtilities.createTextResponse(JSON.stringify(response, null, 2));
      },
    );
  }
}

export const BuildClinicianHandoffBriefToolInstance =
  new BuildClinicianHandoffBriefTool();
