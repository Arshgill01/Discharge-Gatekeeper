import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Request } from "express";
import { z } from "zod";
import { IMcpTool } from "../IMcpTool";
import { McpUtilities } from "../mcp-utilities";
import { CANONICAL_BLOCKER_CATEGORIES, CANONICAL_VERDICTS } from "../clinical-intelligence/contract";
import { synthesizeTransitionNarrative } from "../clinical-intelligence/synthesize-transition-narrative";
import { TransitionNarrativeOutput } from "../clinical-intelligence/synthesize-transition-narrative";

export const SYNTHESIZE_TRANSITION_NARRATIVE_TOOL_DESCRIPTION =
  "Prompt 3 tool for pre-discharge execution. Use when asked what must happen before discharge and to prepare the transition package grounded in hidden-risk findings. Do not use this for Prompt 1 deterministic baseline-only assessment.";

const inputSchema = {
  deterministic_snapshot: z.object({
    patient_id: z.string().nullable().optional(),
    encounter_id: z.string().nullable().optional(),
    baseline_verdict: z.enum(CANONICAL_VERDICTS),
    deterministic_blockers: z
      .array(
        z.object({
          blocker_id: z.string(),
          category: z.enum(CANONICAL_BLOCKER_CATEGORIES),
          description: z.string(),
          severity: z.enum(["low", "medium", "high"]).optional(),
        }),
      )
      .default([]),
    deterministic_evidence: z
      .array(
        z.object({
          evidence_id: z.string().optional(),
          source_label: z.string(),
          detail: z.string().optional(),
        }),
      )
      .default([]),
    deterministic_next_steps: z.array(z.string()).default([]),
    deterministic_summary: z.string(),
  }),
  narrative_evidence_bundle: z
    .array(
      z.object({
        source_id: z.string(),
        source_type: z.string(),
        source_label: z.string(),
        locator: z.string().optional(),
        timestamp: z.string().optional(),
        excerpt: z.string(),
      }),
    )
    .default([]),
  optional_context_metadata: z
    .object({
      care_setting: z.string().optional(),
      discharge_destination: z.string().optional(),
      reviewer_timestamp: z.string().optional(),
      explicit_task_goal: z.string().optional(),
    })
    .optional(),
  response_mode: z
    .enum(["prompt_opinion_slim", "full"])
    .default("prompt_opinion_slim")
    .describe(
      "Optional output mode. Use prompt_opinion_slim for compact transcript-safe payloads in Prompt Opinion. Use full for full-fidelity debugging.",
    ),
};

const toolInputSchema = z.object(inputSchema);

const formatPromptOpinionSlimTransitionPackage = (
  payload: TransitionNarrativeOutput,
): string => {
  const actions = payload.recommended_actions
    .slice(0, 4)
    .map((action) => `${action.priority}: ${action.action}`)
    .join(" | ");
  const anchors = payload.citations
    .slice(0, 4)
    .map((citation) => citation.source_label)
    .join("; ");
  const handoff =
    payload.key_points.find((point) => point.startsWith("Clinician handoff brief:")) ||
    `Clinician handoff brief: baseline was ${payload.baseline_verdict}; final posture is ${payload.proposed_disposition}.`;
  const patientGuidance =
    payload.key_points.find((point) => point.startsWith("Patient-facing guidance:")) ||
    "Patient-facing guidance: explain that discharge timing depends on clinical sign-off after safety blockers are cleared.";

  return [
    `Transition package: final posture ${payload.proposed_disposition}; structured baseline ${payload.baseline_verdict}.`,
    `Before discharge: ${actions}.`,
    handoff,
    patientGuidance,
    `Evidence anchors: ${anchors}.`,
    payload.safety_boundary,
  ].join(" ");
};

class SynthesizeTransitionNarrativeTool implements IMcpTool {
  registerTool(server: McpServer, _req: Request): void {
    server.registerTool(
      "synthesize_transition_narrative",
      {
        description: SYNTHESIZE_TRANSITION_NARRATIVE_TOOL_DESCRIPTION,
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

          const payload = await synthesizeTransitionNarrative(parsed.data, {
            responseMode: parsed.data.response_mode,
          });
          const isError = payload.status === "error";
          if (parsed.data.response_mode === "prompt_opinion_slim") {
            return McpUtilities.createTextResponse(
              formatPromptOpinionSlimTransitionPackage(payload),
              { isError },
            );
          }
          return McpUtilities.createTextResponse(JSON.stringify(payload, null, 2), { isError });
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
