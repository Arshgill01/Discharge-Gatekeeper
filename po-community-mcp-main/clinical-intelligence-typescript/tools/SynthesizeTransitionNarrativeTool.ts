import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Request } from "express";
import { z } from "zod";
import { IMcpTool } from "../IMcpTool";
import { McpUtilities } from "../mcp-utilities";
import { synthesizeTransitionNarrative } from "../clinical-intelligence/synthesize-transition-narrative";
import { TransitionNarrativeOutput } from "../clinical-intelligence/synthesize-transition-narrative";
import {
  deterministicSnapshotSchema,
  fhirContextSchema,
  narrativeSourceSchema,
} from "../clinical-intelligence/contract";
import {
  DEFAULT_HIDDEN_RISK_SCENARIO_ID,
  resolveHiddenRiskToolInput,
} from "./canonical-hidden-risk-input";
import {
  buildFhirDirectPatientScopeResult,
  DIRECT_PATIENT_SCOPE_PROMPTS,
} from "./fhirDirectPatientScope";

export const SYNTHESIZE_TRANSITION_NARRATIVE_TOOL_DESCRIPTION =
  "Prompt 3 transition package tool. In Patient Scope / FHIR context, create or refresh blocking FHIR Tasks plus audit artifacts and return the cited transition package. Without FHIR context, fall back to the canonical trap-patient Prompt 3 demo.";

const inputSchema = {
  scenario_id: z
    .literal(DEFAULT_HIDDEN_RISK_SCENARIO_ID)
    .default(DEFAULT_HIDDEN_RISK_SCENARIO_ID)
    .describe("Canonical Prompt Opinion trap patient scenario id."),
  deterministic_snapshot: deterministicSnapshotSchema
    .optional()
    .describe("Structured baseline snapshot supplied by the A2A/direct validation path."),
  narrative_evidence_bundle: z
    .array(narrativeSourceSchema)
    .optional()
    .describe("Narrative evidence supplied by the A2A/direct validation path."),
  optional_context_metadata: z
    .object({
      care_setting: z.string().optional(),
      discharge_destination: z.string().optional(),
      reviewer_timestamp: z.string().optional(),
      explicit_task_goal: z.string().optional(),
    })
    .optional(),
  fhir_context: fhirContextSchema
    .optional()
    .describe("Optional FHIR-native context envelope carrying resource references and narrative provenance."),
  response_mode: z
    .enum(["prompt_opinion_slim", "full"])
    .optional()
    .describe("Use full JSON for machine validation; use prompt_opinion_slim for visible Prompt Opinion output."),
};

const toolInputSchema = z.object(inputSchema);

export const formatPromptOpinionSlimTransitionPackage = (
  payload: TransitionNarrativeOutput,
): string => {
  const compactAction = (value: string): string => {
    const condensed = value
      .replace(/^Owner (?:now|before discharge):\s*/i, "")
      .replace(/\s+Evidence:.*$/i, "")
      .replace(/\s+/g, " ")
      .trim();
    return condensed.length > 92 ? `${condensed.slice(0, 89).trimEnd()}...` : condensed;
  };
  const evidenceLines = payload.citations
    .slice(0, 4)
    .map((citation) => {
      const prefix = citation.fhir_reference ? `${citation.fhir_reference} | ` : "";
      return `- ${prefix}${citation.source_label}`;
    });
  const rawReferences = [...new Set(payload.citations.map((citation) => citation.fhir_reference).filter(Boolean))];
  const actionLines = payload.recommended_actions
    .slice(0, 5)
    .map((action, index) => `${index + 1}. ${compactAction(action.action)}`);

  return [
    payload.proposed_disposition === "not_ready"
      ? "TRANSITION PACKAGE - DISCHARGE HOLD ACTIVE"
      : "TRANSITION PACKAGE",
    "",
    "Release condition:",
    payload.proposed_disposition === "not_ready"
      ? "Do not discharge until the cited blocking gates are resolved and clinician review confirms a safe transition."
      : "Complete the cited actions and clinician review before final disposition.",
    "",
    "Actions:",
    ...(actionLines.length > 0 ? actionLines : ["1. No additional actions generated."]),
    "",
    "Evidence:",
    ...(evidenceLines.length > 0 ? evidenceLines : ["- none"]),
    `Raw FHIR references: ${rawReferences.length > 0 ? rawReferences.join(" | ") : "none"}.`,
    "",
    "Clinician review required; this does not approve discharge autonomously.",
  ].join("\n");
};

class SynthesizeTransitionNarrativeTool implements IMcpTool {
  registerTool(server: McpServer, req: Request): void {
    server.registerTool(
      "synthesize_transition_narrative",
      {
        description: SYNTHESIZE_TRANSITION_NARRATIVE_TOOL_DESCRIPTION,
        annotations: {
          readOnlyHint: true,
        },
        inputSchema,
      },
      async (rawInput) => {
        try {
          const parsed = toolInputSchema.safeParse(rawInput);
          if (!parsed.success) {
            throw new Error(
              `Invalid input for synthesize_transition_narrative: ${parsed.error.message}`,
            );
          }

          const liveResult = await buildFhirDirectPatientScopeResult(req, {
            prompt: DIRECT_PATIENT_SCOPE_PROMPTS.prompt3,
            explicitTaskGoal:
              "Prompt 3 Patient Scope transition package with FHIR Task write-back.",
          });
          if (liveResult) {
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
          }

          const hiddenRiskInput = resolveHiddenRiskToolInput(
            parsed.data,
            "Prompt 3 Direct-MCP concise transition package using compact canonical scenario input.",
          );
          const responseMode =
            parsed.data.response_mode ??
            (parsed.data.deterministic_snapshot ? "full" : "prompt_opinion_slim");
          const payload = await synthesizeTransitionNarrative(hiddenRiskInput, {
            responseMode,
          });
          const isError = payload.status === "error";
          if (responseMode === "full") {
            return McpUtilities.createTextResponse(JSON.stringify(payload, null, 2), { isError });
          }

          return {
            content: [
              {
                type: "text",
                text: formatPromptOpinionSlimTransitionPackage(payload),
              },
            ],
            isError,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return McpUtilities.createTextResponse(
            JSON.stringify(
              {
                contract_version: "phase0_transition_narrative_v1",
                status: "error",
                message: `synthesize_transition_narrative invocation failed: ${message}`,
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

export const SynthesizeTransitionNarrativeToolInstance =
  new SynthesizeTransitionNarrativeTool();
