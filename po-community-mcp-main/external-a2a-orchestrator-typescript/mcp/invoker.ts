import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  A2ATaskInput,
  DeterministicResponse,
  DownstreamCallDiagnostic,
  DownstreamHttpExchange,
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
      blocker_trust_state: z.string(),
      trace_summary: z.string(),
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

const toRequestUrl = (input: Parameters<typeof fetch>[0]): string => {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
};

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

type InvocationContext = {
  requestId: string;
  taskId: string;
  promptMode: "prompt_1" | "prompt_2" | "prompt_3";
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

  private async withClient<T>(
    mcpUrl: string,
    propagatedHeaders: Record<string, string>,
    httpExchanges: DownstreamHttpExchange[],
    action: (client: Client) => Promise<T>,
  ): Promise<T> {
    const client = new Client(
      {
        name: "external-a2a-orchestrator-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      },
    );

    const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
      fetch: async (input, init) => {
        const headers = new Headers(init?.headers);
        for (const [name, value] of Object.entries(propagatedHeaders)) {
          headers.set(name, value);
        }

        const startedAtMs = Date.now();
        const response = await fetch(input, {
          ...init,
          headers,
        });

        httpExchanges.push({
          method: init?.method || "GET",
          url: toRequestUrl(input),
          status: response.status,
          duration_ms: Date.now() - startedAtMs,
          request_content_type: headers.get("content-type"),
          request_accept: headers.get("accept"),
          response_content_type: response.headers.get("content-type"),
        });

        return response;
      },
    });

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
    invocationContext: InvocationContext,
    action: (client: Client) => Promise<unknown>,
    parser: (payload: unknown) => T,
  ): Promise<McpInvocationResult<T>> {
    const callId = randomUUID();
    const startedAt = new Date().toISOString();
    const startedMs = Date.now();
    const httpExchanges: DownstreamHttpExchange[] = [];
    const propagatedHeaders = {
      "x-request-id": invocationContext.requestId,
      "request-id": invocationContext.requestId,
      "x-correlation-id": invocationContext.taskId,
      "x-a2a-task-id": invocationContext.taskId,
      "x-a2a-call-id": callId,
      "x-a2a-prompt-mode": invocationContext.promptMode,
    };

    try {
      const raw = await this.withClient(mcpUrl, propagatedHeaders, httpExchanges, action);
      const parsed = parser(extractJsonToolResponse(raw));

      return {
        payload: parsed,
        diagnostic: {
          call_id: callId,
          component,
          tool_name: toolName,
          mcp_url: mcpUrl,
          status: "ok",
          request_id: invocationContext.requestId,
          task_id: invocationContext.taskId,
          started_at: startedAt,
          duration_ms: Date.now() - startedMs,
          propagated_headers: propagatedHeaders,
          http_exchanges: httpExchanges,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const diagnostic: DownstreamCallDiagnostic = {
        call_id: callId,
        component,
        tool_name: toolName,
        mcp_url: mcpUrl,
        status: "error",
        request_id: invocationContext.requestId,
        task_id: invocationContext.taskId,
        started_at: startedAt,
        duration_ms: Date.now() - startedMs,
        propagated_headers: propagatedHeaders,
        http_exchanges: httpExchanges,
        error_message: message,
      };

      throw new McpInvocationError(errorCode, stage, diagnostic);
    }
  }

  async invokeDeterministicReadiness(
    input: A2ATaskInput,
    invocationContext: InvocationContext,
  ): Promise<McpInvocationResult<DeterministicResponse>> {
    const scenarioId = input.patient_context?.scenario_id || this.config.defaultStructuredScenarioId;

    return this.invokeWithDiagnostics(
      "discharge_gatekeeper_mcp",
      "assess_discharge_readiness",
      this.config.dischargeGatekeeperMcpUrl,
      "deterministic_call",
      "deterministic_mcp_failure",
      invocationContext,
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
    invocationContext: InvocationContext,
  ): Promise<McpInvocationResult<HiddenRiskResponse>> {
    const narrative = input.patient_context?.narrative_evidence_bundle || [];
    return this.invokeWithDiagnostics(
      "clinical_intelligence_mcp",
      "surface_hidden_risks",
      this.config.clinicalIntelligenceMcpUrl,
      "hidden_risk_call",
      "clinical_intelligence_mcp_failure",
      invocationContext,
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
