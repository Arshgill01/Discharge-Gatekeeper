import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { z } from "zod";
import {
  A2ATaskInput,
  DeterministicResponse,
  DownstreamCallDiagnostic,
  HiddenRiskResponse,
} from "../types";
import { RuntimeConfig } from "../runtime-config";

const deterministicResponseSchema = z.object({
  verdict: z.enum(["ready", "ready_with_caveats", "not_ready"]),
  blockers: z.array(
    z.object({
      id: z.string(),
      category: z.string(),
      priority: z.string(),
      description: z.string(),
      evidence: z.array(z.string()),
      actionability: z.string(),
    }),
  ),
  evidence: z.array(
    z.object({
      id: z.string(),
      source_type: z.string(),
      source_label: z.string(),
      detail: z.string(),
    }),
  ),
  next_steps: z.array(
    z.object({
      id: z.string(),
      priority: z.string(),
      action: z.string(),
      owner: z.string(),
      linked_blockers: z.array(z.string()),
      linked_evidence: z.array(z.string()),
    }),
  ),
  summary: z.string(),
});

const hiddenRiskResponseSchema = z.object({
  contract_version: z.literal("phase0_hidden_risk_v1"),
  status: z.enum(["ok", "inconclusive", "insufficient_context", "error"]),
  patient_id: z.string().nullable(),
  encounter_id: z.string().nullable(),
  baseline_verdict: z.enum(["ready", "ready_with_caveats", "not_ready"]),
  hidden_risk_summary: z.object({
    result: z.enum(["hidden_risk_present", "no_hidden_risk", "inconclusive"]),
    overall_disposition_impact: z.enum(["none", "caveat", "not_ready", "uncertain"]),
    confidence: z.enum(["low", "medium", "high"]),
    summary: z.string(),
    manual_review_required: z.boolean(),
    false_positive_guardrail: z.string(),
  }),
  hidden_risk_findings: z.array(
    z.object({
      finding_id: z.string(),
      title: z.string(),
      category: z.string(),
      disposition_impact: z.enum(["none", "caveat", "not_ready", "uncertain"]),
      confidence: z.enum(["low", "medium", "high"]),
      is_duplicate_of_blocker_id: z.string().nullable(),
      rationale: z.string(),
      recommended_orchestrator_action: z.enum([
        "add_blocker",
        "escalate_existing_blocker",
        "request_manual_review",
        "ignore_duplicate",
      ]),
      citation_ids: z.array(z.string()),
    }),
  ),
  citations: z.array(
    z.object({
      citation_id: z.string(),
      source_type: z.string(),
      source_label: z.string(),
      locator: z.string(),
      excerpt: z.string(),
    }),
  ),
  review_metadata: z.object({
    narrative_sources_reviewed: z.number(),
    duplicate_findings_suppressed: z.number(),
    weak_findings_suppressed: z.number(),
  }),
});

const extractJsonToolResponse = (toolResult: unknown): unknown => {
  if (
    !toolResult ||
    typeof toolResult !== "object" ||
    !("content" in toolResult) ||
    !Array.isArray((toolResult as { content: unknown[] }).content)
  ) {
    throw new Error("MCP tool response did not include a content array.");
  }

  const textItem = (toolResult as { content: unknown[] }).content.find(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "type" in item &&
      "text" in item &&
      (item as { type: string }).type === "text",
  ) as { text: string } | undefined;

  if (!textItem) {
    throw new Error("MCP tool response did not include text output.");
  }

  return JSON.parse(textItem.text);
};

type McpInvocationResult<T> = {
  payload: T;
  diagnostic: DownstreamCallDiagnostic;
};

export class McpInvocationError extends Error {
  constructor(
    readonly code: "deterministic_mcp_failure" | "clinical_intelligence_mcp_failure",
    readonly stage: "deterministic_call" | "hidden_risk_call",
    readonly diagnostic: DownstreamCallDiagnostic,
  ) {
    super(diagnostic.error_message || "MCP invocation failed");
    this.name = "McpInvocationError";
  }
}

export class McpToolInvoker {
  constructor(private readonly config: RuntimeConfig) {}

  private async withClient<T>(mcpUrl: string, action: (client: Client) => Promise<T>): Promise<T> {
    const client = new Client(
      {
        name: "external-a2a-orchestrator-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      },
    );

    const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));

    await client.connect(transport);
    try {
      return await action(client);
    } finally {
      await client.close();
    }
  }

  private async invokeWithDiagnostics<T>(
    component: DownstreamCallDiagnostic["component"],
    toolName: string,
    mcpUrl: string,
    stage: McpInvocationError["stage"],
    errorCode: McpInvocationError["code"],
    action: (client: Client) => Promise<unknown>,
    parser: (payload: unknown) => T,
  ): Promise<McpInvocationResult<T>> {
    const startedAt = new Date().toISOString();
    const startedMs = Date.now();

    try {
      const raw = await this.withClient(mcpUrl, action);
      const parsed = parser(extractJsonToolResponse(raw));

      return {
        payload: parsed,
        diagnostic: {
          component,
          tool_name: toolName,
          mcp_url: mcpUrl,
          status: "ok",
          started_at: startedAt,
          duration_ms: Date.now() - startedMs,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const diagnostic: DownstreamCallDiagnostic = {
        component,
        tool_name: toolName,
        mcp_url: mcpUrl,
        status: "error",
        started_at: startedAt,
        duration_ms: Date.now() - startedMs,
        error_message: message,
      };

      throw new McpInvocationError(errorCode, stage, diagnostic);
    }
  }

  async invokeDeterministicReadiness(input: A2ATaskInput): Promise<McpInvocationResult<DeterministicResponse>> {
    const scenarioId = input.patient_context?.scenario_id || this.config.defaultStructuredScenarioId;

    return this.invokeWithDiagnostics(
      "discharge_gatekeeper_mcp",
      "assess_discharge_readiness",
      this.config.dischargeGatekeeperMcpUrl,
      "deterministic_call",
      "deterministic_mcp_failure",
      async (client) => {
        return client.callTool({
          name: "assess_discharge_readiness",
          arguments: {
            scenario_id: scenarioId,
          },
        });
      },
      (payload) => {
        const parsed = deterministicResponseSchema.safeParse(payload);
        if (!parsed.success) {
          throw new Error(`Invalid deterministic MCP payload: ${parsed.error.message}`);
        }
        return parsed.data;
      },
    );
  }

  async invokeHiddenRisk(
    deterministic: DeterministicResponse,
    input: A2ATaskInput,
  ): Promise<McpInvocationResult<HiddenRiskResponse>> {
    const narrative = input.patient_context?.narrative_evidence_bundle || [];
    return this.invokeWithDiagnostics(
      "clinical_intelligence_mcp",
      "surface_hidden_risks",
      this.config.clinicalIntelligenceMcpUrl,
      "hidden_risk_call",
      "clinical_intelligence_mcp_failure",
      async (client) => {
        return client.callTool({
          name: "surface_hidden_risks",
          arguments: {
            deterministic_snapshot: {
              patient_id: input.patient_context?.patient_id || null,
              encounter_id: input.patient_context?.encounter_id || null,
              baseline_verdict: deterministic.verdict,
              deterministic_blockers: deterministic.blockers.map((blocker) => ({
                blocker_id: blocker.id,
                category: blocker.category,
                description: blocker.description,
                severity: blocker.priority,
              })),
              deterministic_evidence: deterministic.evidence.map((evidence) => ({
                evidence_id: evidence.id,
                source_label: evidence.source_label,
                detail: evidence.detail,
              })),
              deterministic_next_steps: deterministic.next_steps.map((step) => step.action),
              deterministic_summary: deterministic.summary,
            },
            narrative_evidence_bundle: narrative,
            optional_context_metadata: input.patient_context?.optional_context_metadata,
          },
        });
      },
      (payload) => {
        const parsed = hiddenRiskResponseSchema.safeParse(payload);
        if (!parsed.success) {
          throw new Error(`Invalid hidden-risk MCP payload: ${parsed.error.message}`);
        }
        return parsed.data;
      },
    );
  }
}
