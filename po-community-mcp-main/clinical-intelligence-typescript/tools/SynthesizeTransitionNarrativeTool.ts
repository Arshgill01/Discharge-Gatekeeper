import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { Request } from "express";
import { z } from "zod";
import { IMcpTool } from "../IMcpTool";
import { McpUtilities } from "../mcp-utilities";
import { CANONICAL_BLOCKER_CATEGORIES, CANONICAL_VERDICTS } from "../clinical-intelligence/contract";
import { synthesizeTransitionNarrative } from "../clinical-intelligence/synthesize-transition-narrative";

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
      async (rawInput) => {
        try {
          const payload = await synthesizeTransitionNarrative(rawInput);
          const isError = payload.status === "error";
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
