import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Request } from "express";
import { z } from "zod";
import { IMcpTool } from "../IMcpTool";
import { McpUtilities } from "../mcp-utilities";

const inputSchema = {
  patient_id: z.string().optional(),
  encounter_id: z.string().optional(),
};

class SynthesizeTransitionNarrativeTool implements IMcpTool {
  registerTool(server: McpServer, _req: Request): void {
    server.registerTool(
      "synthesize_transition_narrative",
      {
        description:
          "Synthesize a concise clinician-useful transition narrative grounded in structured and note evidence.",
        inputSchema,
      },
      async ({ patient_id, encounter_id }) => {
        const payload = {
          status: "not_implemented",
          patient_id: patient_id ?? null,
          encounter_id: encounter_id ?? null,
          message: "synthesize_transition_narrative implementation in progress",
        };
        return McpUtilities.createTextResponse(JSON.stringify(payload, null, 2), {
          isError: true,
        });
      },
    );
  }
}

export const SynthesizeTransitionNarrativeToolInstance =
  new SynthesizeTransitionNarrativeTool();
