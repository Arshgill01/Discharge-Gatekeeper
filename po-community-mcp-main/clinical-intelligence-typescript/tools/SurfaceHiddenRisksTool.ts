import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Request } from "express";
import { z } from "zod";
import { IMcpTool } from "../IMcpTool";
import { McpUtilities } from "../mcp-utilities";

const inputSchema = {
  patient_id: z.string().optional(),
  encounter_id: z.string().optional(),
};

class SurfaceHiddenRisksTool implements IMcpTool {
  registerTool(server: McpServer, _req: Request): void {
    server.registerTool(
      "surface_hidden_risks",
      {
        description:
          "Surface narrative-only hidden discharge risks with citations and bounded disposition impact.",
        inputSchema,
      },
      async ({ patient_id, encounter_id }) => {
        const payload = {
          status: "not_implemented",
          patient_id: patient_id ?? null,
          encounter_id: encounter_id ?? null,
          message: "surface_hidden_risks implementation in progress",
        };
        return McpUtilities.createTextResponse(JSON.stringify(payload, null, 2), {
          isError: true,
        });
      },
    );
  }
}

export const SurfaceHiddenRisksToolInstance = new SurfaceHiddenRisksTool();
