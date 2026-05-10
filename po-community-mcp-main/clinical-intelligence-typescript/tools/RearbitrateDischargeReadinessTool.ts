import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Request } from "express";
import { z } from "zod";
import { IMcpTool } from "../IMcpTool";
import { McpUtilities } from "../mcp-utilities";
import {
  buildFhirDirectPatientScopeResult,
} from "./fhirDirectPatientScope";

export const REARBITRATE_DISCHARGE_READINESS_TOOL_DESCRIPTION =
  "Prompt 4 re-arbitration tool for Patient Scope / FHIR context. Use when new updates resolve some discharge gates and you must reread FHIR Tasks plus evidence before changing the verdict. Pass the user update in resolution_update verbatim.";

const inputSchema = {
  resolution_update: z
    .string()
    .min(1)
    .describe("Verbatim update describing which discharge gates were resolved or remain active."),
  response_mode: z
    .enum(["prompt_opinion_slim", "full"])
    .default("prompt_opinion_slim")
    .describe("Use prompt_opinion_slim for visible Prompt Opinion output."),
};

const toolInputSchema = z.object(inputSchema);

class RearbitrateDischargeReadinessTool implements IMcpTool {
  registerTool(server: McpServer, req: Request): void {
    server.registerTool(
      "rearbitrate_discharge_readiness",
      {
        description: REARBITRATE_DISCHARGE_READINESS_TOOL_DESCRIPTION,
        annotations: {
          readOnlyHint: false,
        },
        inputSchema,
      },
      async (rawInput) => {
        try {
          const parsed = toolInputSchema.safeParse(rawInput);
          if (!parsed.success) {
            throw new Error(
              `Invalid input for rearbitrate_discharge_readiness: ${parsed.error.message}`,
            );
          }

          const liveResult = await buildFhirDirectPatientScopeResult(req, {
            prompt: parsed.data.resolution_update,
            explicitTaskGoal:
              "Prompt 4 Patient Scope discharge rearbitration from FHIR Tasks and updated evidence.",
          });
          if (!liveResult) {
            throw new Error(
              "rearbitrate_discharge_readiness requires Prompt Opinion Patient Scope FHIR context.",
            );
          }

          if (parsed.data.response_mode === "full") {
            return McpUtilities.createTextResponse(
              JSON.stringify(
                {
                  narrative: liveResult.narrative,
                  prompt_payload: liveResult.prompt_payload,
                  reconciliation: liveResult.reconciled,
                },
                null,
                2,
              ),
            );
          }

          return McpUtilities.createTextResponse(liveResult.narrative);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return McpUtilities.createTextResponse(
            JSON.stringify(
              {
                contract_version: "phase10_rearbitration_v1",
                status: "error",
                message: `rearbitrate_discharge_readiness invocation failed: ${message}`,
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

export const RearbitrateDischargeReadinessToolInstance =
  new RearbitrateDischargeReadinessTool();
