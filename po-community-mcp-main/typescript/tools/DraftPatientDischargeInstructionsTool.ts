import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Request } from "express";
import { z } from "zod";
import { IMcpTool } from "../IMcpTool";
import { McpUtilities } from "../mcp-utilities";
import { draftPatientDischargeInstructionsV1 } from "../discharge-readiness/workflow-artifacts";
import {
  V1_PATIENT_INSTRUCTIONS_TOOL_NAME,
  V1_SUPPORTED_SCENARIO_IDS,
} from "../discharge-readiness/contract";
import {
  isSupportedScenarioId,
} from "../discharge-readiness/scenario-selection";
import { resolveWorkflowInputForRequest } from "../discharge-readiness/live-context";

class DraftPatientDischargeInstructionsTool implements IMcpTool {
  registerTool(server: McpServer, req: Request) {
    server.registerTool(
      V1_PATIENT_INSTRUCTIONS_TOOL_NAME,
      {
        description:
          "Deterministic patient-instruction artifact from structured blockers only. Does not perform hidden-risk contradiction or Prompt 2/3 reconciliation.",
        inputSchema: {
          scenario_id: z
            .string()
            .describe(
              "Optional fixture scenario id. Defaults to first_synthetic_discharge_slice_v1.",
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
        const response = draftPatientDischargeInstructionsV1(input);
        return McpUtilities.createTextResponse(JSON.stringify(response, null, 2));
      },
    );
  }
}

export const DraftPatientDischargeInstructionsToolInstance =
  new DraftPatientDischargeInstructionsTool();
