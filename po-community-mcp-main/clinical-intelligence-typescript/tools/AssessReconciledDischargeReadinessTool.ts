import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Request } from "express";
import { z } from "zod";
import { IMcpTool } from "../IMcpTool";
import { McpUtilities } from "../mcp-utilities";
import {
  assessReconciledDischargeReadiness,
  DEFAULT_RECONCILED_SCENARIO_ID,
} from "../clinical-intelligence/reconciled-discharge-readiness";
import {
  buildFhirDirectPatientScopeResult,
  DIRECT_PATIENT_SCOPE_PROMPTS,
} from "./fhirDirectPatientScope";

export const ASSESS_RECONCILED_DISCHARGE_READINESS_TOOL_DESCRIPTION =
  "Prompt 1 reconciled readiness tool. In Patient Scope / FHIR context, use the live patient FHIR discharge context, reconcile structured baseline plus hidden-risk evidence, and return the final verdict with FHIR references. Without FHIR context, fall back to the canonical trap-patient Prompt 1 demo.";

const inputSchema = {
  scenario_id: z
    .literal(DEFAULT_RECONCILED_SCENARIO_ID)
    .default(DEFAULT_RECONCILED_SCENARIO_ID)
    .describe("Canonical Prompt Opinion trap patient scenario id."),
  response_mode: z
    .enum(["prompt_opinion_slim", "full"])
    .default("prompt_opinion_slim")
    .describe(
      "Use prompt_opinion_slim for compact Prompt Opinion transcript output.",
    ),
};

const toolInputSchema = z.object(inputSchema);

class AssessReconciledDischargeReadinessTool implements IMcpTool {
  registerTool(server: McpServer, req: Request): void {
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

          const liveResult = await buildFhirDirectPatientScopeResult(req, {
            prompt: DIRECT_PATIENT_SCOPE_PROMPTS.prompt1,
            explicitTaskGoal:
              "Prompt 1 Patient Scope reconciled readiness from live FHIR context.",
          });
          if (liveResult) {
            const text =
              parsed.data.response_mode === "prompt_opinion_slim"
                ? liveResult.narrative
                : JSON.stringify(
                    {
                      narrative: liveResult.narrative,
                      prompt_payload: liveResult.prompt_payload,
                      reconciliation: liveResult.reconciled,
                    },
                    null,
                    2,
                  );
            return McpUtilities.createTextResponse(text);
          }

          const payload = await assessReconciledDischargeReadiness({
            responseMode: parsed.data.response_mode,
          });
          const text =
            parsed.data.response_mode === "prompt_opinion_slim"
              ? payload.prompt_opinion_visible_answer
              : JSON.stringify(payload, null, 2);
          return McpUtilities.createTextResponse(text, {
            isError: payload.status === "error",
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
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
