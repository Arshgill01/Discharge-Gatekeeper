import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Request } from "express";
import { z } from "zod";
import { IMcpTool } from "../IMcpTool";
import { McpUtilities } from "../mcp-utilities";
import { synthesizeTransitionNarrative } from "../clinical-intelligence/synthesize-transition-narrative";
import { TransitionNarrativeOutput } from "../clinical-intelligence/synthesize-transition-narrative";
import {
  deterministicSnapshotSchema,
  narrativeSourceSchema,
} from "../clinical-intelligence/contract";
import {
  DEFAULT_HIDDEN_RISK_SCENARIO_ID,
  resolveHiddenRiskToolInput,
} from "./canonical-hidden-risk-input";

export const SYNTHESIZE_TRANSITION_NARRATIVE_TOOL_DESCRIPTION =
  "Prompt 3 compact transition package for the canonical trap patient. Call with scenario_id only and return the tool text verbatim: final not_ready posture, blockers, actions, handoff, patient note, evidence anchors.";

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
  response_mode: z
    .enum(["prompt_opinion_slim", "full"])
    .optional()
    .describe("Use full JSON for machine validation; use prompt_opinion_slim for visible Prompt Opinion output."),
};

const toolInputSchema = z.object(inputSchema);

const formatPromptOpinionSlimTransitionPackage = (
  payload: TransitionNarrativeOutput,
): string => {
  const blockerCategories = [
    ...new Set(payload.recommended_actions.flatMap((action) => action.linked_categories)),
  ].slice(0, 3);
  const blockerLine = blockerCategories.length > 0
    ? `Immediate blockers: ${blockerCategories.join("; ")}.`
    : "Immediate blockers: none surfaced by hidden-risk review; continue deterministic safeguards.";
  const actions = payload.recommended_actions
    .slice(0, 5)
    .map((action, index) => {
      const stripInlineEvidence = (value: string) =>
        value.replace(/\s+Evidence:.*$/i, "").trim();
      const ownerMatch = action.action.match(/^Owner (now|before discharge): ([^.]+)\. (.*)$/);
      if (!ownerMatch) {
        return `${index + 1}. ${action.priority} - ${stripInlineEvidence(action.action)}`;
      }

      const timing = ownerMatch[1] || "before discharge";
      const owner = ownerMatch[2] || "care team";
      const actionText = stripInlineEvidence(ownerMatch[3] || action.action);
      return `${index + 1}. ${action.priority} - owner: ${owner}; action: ${actionText}; timing: ${timing}.`;
    })
    .join(" ");
  const anchors = payload.citations
    .slice(0, 3)
    .map((citation) => citation.source_label)
    .join("; ");
  const handoff =
    payload.key_points.find((point) => point.startsWith("Clinician handoff brief:")) ||
    `Clinician handoff brief: baseline was ${payload.baseline_verdict}; final posture is ${payload.proposed_disposition}.`;
  const patientGuidance =
    payload.key_points.find((point) => point.startsWith("Patient-facing guidance:")) ||
    "Patient-facing guidance: explain that discharge timing depends on clinical sign-off after safety blockers are cleared.";
  const normalizedHandoff = handoff.replace(/^Clinician handoff brief:\s*/i, "");
  const normalizedPatientGuidance = patientGuidance.replace(/^Patient-facing guidance:\s*/i, "");

  return [
    `Final posture: ${payload.proposed_disposition}; structured baseline: ${payload.baseline_verdict}.`,
    blockerLine,
    `Actions: ${actions}`,
    `Clinician handoff: 1. ${normalizedHandoff} 2. Recheck exertional oxygenation before discharge. 3. Confirm equipment/support before release.`,
    `Patient note: 1. ${normalizedPatientGuidance} 2. The team will explain oxygen/support plans. 3. Final release requires clinician sign-off.`,
    `Evidence anchors: ${anchors}. Hidden-risk evidence referenced by source only; raw note text not repeated.`,
    payload.safety_boundary,
  ].join(" ");
};

class SynthesizeTransitionNarrativeTool implements IMcpTool {
  registerTool(server: McpServer, _req: Request): void {
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
