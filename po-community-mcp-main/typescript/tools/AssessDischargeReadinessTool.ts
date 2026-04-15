import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Request } from "express";
import { z } from "zod";
import { IMcpTool } from "../IMcpTool";
import { McpUtilities } from "../mcp-utilities";
import { assessDischargeReadinessV1 } from "../discharge-readiness/assess-discharge-readiness";
import {
  V1_SCENARIO_2_ID,
  V1_SCENARIO_ID,
  V1_SUPPORTED_SCENARIO_IDS,
  V1_TOOL_NAME,
} from "../discharge-readiness/contract";
import { FIRST_SYNTHETIC_SCENARIO_V1 } from "../discharge-readiness/scenario-v1";
import { SECOND_SYNTHETIC_SCENARIO_V1 } from "../discharge-readiness/scenario-v2";

const SCENARIO_BY_ID = {
  [V1_SCENARIO_ID]: FIRST_SYNTHETIC_SCENARIO_V1,
  [V1_SCENARIO_2_ID]: SECOND_SYNTHETIC_SCENARIO_V1,
};

class AssessDischargeReadinessTool implements IMcpTool {
  registerTool(server: McpServer, _req: Request) {
    server.registerTool(
      V1_TOOL_NAME,
      {
        description:
          "Assistive discharge-readiness assessment that returns verdict, blockers, evidence, next steps, and summary.",
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
        if (scenario_id && !(scenario_id in SCENARIO_BY_ID)) {
          return McpUtilities.createTextResponse(
            `Unsupported scenario_id '${scenario_id}'. Supported values: '${V1_SUPPORTED_SCENARIO_IDS.join("', '")}'.`,
            { isError: true },
          );
        }

        const selectedScenario = scenario_id
          ? SCENARIO_BY_ID[scenario_id as keyof typeof SCENARIO_BY_ID]
          : FIRST_SYNTHETIC_SCENARIO_V1;
        const response = assessDischargeReadinessV1(selectedScenario);
        return McpUtilities.createTextResponse(JSON.stringify(response, null, 2));
      },
    );
  }
}

export const AssessDischargeReadinessToolInstance =
  new AssessDischargeReadinessTool();
