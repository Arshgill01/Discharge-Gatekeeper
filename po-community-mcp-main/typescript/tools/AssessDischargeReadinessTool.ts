import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Request } from "express";
import { z } from "zod";
import { IMcpTool } from "../IMcpTool";
import { McpUtilities } from "../mcp-utilities";
import { assessDischargeReadinessV1 } from "../discharge-readiness/assess-discharge-readiness";
import {
  V1_SCENARIO_ID,
  V1_TOOL_NAME,
} from "../discharge-readiness/contract";
import { FIRST_SYNTHETIC_SCENARIO_V1 } from "../discharge-readiness/scenario-v1";

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
              "Optional scenario identifier. For v1, only first_synthetic_discharge_slice_v1 is supported.",
            )
            .optional(),
        },
      },
      async ({ scenario_id }) => {
        if (scenario_id && scenario_id !== V1_SCENARIO_ID) {
          return McpUtilities.createTextResponse(
            `Unsupported scenario_id '${scenario_id}'. Supported value: '${V1_SCENARIO_ID}'.`,
            { isError: true },
          );
        }

        const response = assessDischargeReadinessV1(FIRST_SYNTHETIC_SCENARIO_V1);
        return McpUtilities.createTextResponse(JSON.stringify(response, null, 2));
      },
    );
  }
}

export const AssessDischargeReadinessToolInstance =
  new AssessDischargeReadinessTool();
