import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { getRuntimeConfig } from "./runtime-config";
import { buildAgentCard } from "./agent-card";
import {
  A2AExecutionBinding,
  A2ATaskError,
  A2ATaskInput,
  A2ATaskRecord,
  IncomingRequestDiagnostic,
  ParsedTaskInputSurface,
  ReconciliationResult,
  TaskRuntimeDiagnostics,
} from "./types";
import { McpInvocationError, McpToolInvoker } from "./mcp/invoker";
import { reconcileOutputs } from "./orchestrator/reconcile";
import { buildPromptPayload, renderBoundedSynthesis } from "./orchestrator/synthesis";

const config = getRuntimeConfig(process.env as Record<string, string | undefined>);
const app = express();
const startTimeMs = Date.now();
const tasks = new Map<string, A2ATaskRecord>();
const invoker = new McpToolInvoker(config);
const MAX_TASK_HISTORY = 200;

class TaskTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Task timed out after ${timeoutMs} ms`);
    this.name = "TaskTimeoutError";
  }
}

class JsonRpcRequestError extends Error {
  constructor(
    readonly code: number,
    message: string,
    readonly data?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "JsonRpcRequestError";
  }
}

type ParsedTaskInput = {
  input: A2ATaskInput;
  inputSurface: ParsedTaskInputSurface;
};

type A2AJsonRpcRequest = {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params: Record<string, unknown>;
};

type A2AJsonRpcResult = {
  task?: Record<string, unknown>;
  message?: Record<string, unknown>;
};

const derivePublicBaseUrl = (req: express.Request): string => {
  const forwardedProto = req.headers["x-forwarded-proto"]?.toString();
  const forwardedHost = req.headers["x-forwarded-host"]?.toString();
  const protocol = forwardedProto || req.protocol || "http";
  const host = forwardedHost || req.get("host") || `127.0.0.1:${config.port}`;
  return `${protocol}://${host}`;
};

app.use(cors());
app.use(express.json({ limit: "1mb", type: ["application/json", "application/*+json"] }));
app.use(express.text({ limit: "1mb", type: ["text/plain", "text/markdown"] }));

const log = (
  level: "info" | "error",
  message: string,
  metadata: Record<string, unknown> = {},
): void => {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...metadata,
  });

  if (level === "error") {
    console.error(line);
    return;
  }

  console.log(line);
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new TaskTimeoutError(timeoutMs)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
};

const firstNonEmptyString = (values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};

const extractPromptText = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (let index = value.length - 1; index >= 0; index -= 1) {
      const extracted = extractPromptText(value[index]);
      if (extracted) {
        return extracted;
      }
    }
    return null;
  }

  const record = asRecord(value);
  if (!record) {
    return null;
  }

  if (record["role"] === "assistant") {
    return null;
  }

  return firstNonEmptyString([
    record["prompt"],
    record["user_prompt"],
    record["query"],
    record["message"],
    record["text"],
    extractPromptText(record["content"]),
    extractPromptText(record["parts"]),
    extractPromptText(record["messages"]),
    extractPromptText(record["input"]),
  ]);
};

const extractRequestIdFromBody = (value: unknown): string | null => {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  return firstNonEmptyString([
    record["request_id"],
    record["requestId"],
    record["id"],
    extractRequestIdFromBody(record["input"]),
    extractRequestIdFromBody(record["task"]),
    extractRequestIdFromBody(record["task_input"]),
    extractRequestIdFromBody(record["taskInput"]),
    extractRequestIdFromBody(record["request"]),
    extractRequestIdFromBody(record["payload"]),
  ]);
};

const extractPatientContext = (payload: Record<string, unknown>): A2ATaskInput["patient_context"] => {
  const patientContext = asRecord(payload["patient_context"] ?? payload["patientContext"]);
  if (!patientContext) {
    return undefined;
  }

  return patientContext as A2ATaskInput["patient_context"];
};

const parseTaskInput = (raw: unknown): ParsedTaskInput => {
  if (typeof raw === "string") {
    const prompt = raw.trim();
    if (!prompt) {
      throw new Error("Task payload text body must contain a non-empty prompt.");
    }

    return {
      inputSurface: "raw_text",
      input: {
        prompt,
      },
    };
  }

  const root = asRecord(raw);
  if (!root) {
    throw new Error("Task payload must be a JSON object or text/plain prompt.");
  }

  const envelopeCandidates = [
    { key: "input", surface: "input_envelope" as const },
    { key: "task", surface: "task_envelope" as const },
    { key: "task_input", surface: "task_input_envelope" as const },
    { key: "taskInput", surface: "taskInput_envelope" as const },
    { key: "request", surface: "request_envelope" as const },
    { key: "payload", surface: "payload_envelope" as const },
  ];
  const selectedEnvelope = envelopeCandidates.find(({ key }) => root[key] !== undefined);
  const payload = selectedEnvelope ? asRecord(root[selectedEnvelope.key]) || root : root;
  const inputSurface: ParsedTaskInput["inputSurface"] = selectedEnvelope?.surface || "root";

  const prompt = firstNonEmptyString([
    payload["prompt"],
    payload["user_prompt"],
    payload["query"],
    payload["message"],
    payload["text"],
    extractPromptText(payload["messages"]),
    extractPromptText(payload["content"]),
    extractPromptText(payload["parts"]),
    typeof root["input"] === "string" ? root["input"] : undefined,
    root["prompt"],
    root["message"],
    extractPromptText(root["messages"]),
  ]);

  if (!prompt) {
    throw new Error(
      "Task payload must include a non-empty prompt in prompt/message/text/messages/content or a text/plain body.",
    );
  }

  return {
    inputSurface,
    input: {
      prompt,
      patient_context:
        extractPatientContext(payload) || extractPatientContext(root),
    },
  };
};

const toOptionalString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const extractA2AMessagePrompt = (message: Record<string, unknown>): string | null => {
  return firstNonEmptyString([
    extractPromptText(message["parts"]),
    extractPromptText(message["content"]),
    extractPromptText(message["message"]),
    message["text"],
    message["prompt"],
  ]);
};

const extractA2APatientContext = (...values: Array<unknown>): A2ATaskInput["patient_context"] => {
  for (const value of values) {
    const record = asRecord(value);
    if (!record) {
      continue;
    }

    const nestedContext = extractPatientContext(record);
    if (nestedContext) {
      return nestedContext;
    }

    const metadata = asRecord(record["metadata"]);
    if (metadata) {
      const metadataContext = extractPatientContext(metadata);
      if (metadataContext) {
        return metadataContext;
      }
    }
  }

  return undefined;
};

const parseA2AHttpJsonMessageSend = (raw: unknown): ParsedTaskInput => {
  const root = asRecord(raw);
  if (!root) {
    throw new Error("A2A HTTP+JSON message/send payload must be a JSON object.");
  }

  const message = asRecord(root["message"]);
  if (!message) {
    throw new Error("A2A HTTP+JSON message/send payload must include a message object.");
  }

  const prompt = extractA2AMessagePrompt(message);
  if (!prompt) {
    throw new Error("A2A message/send payload must include at least one text prompt part.");
  }

  return {
    inputSurface: "a2a_message_send",
    input: {
      prompt,
      patient_context: extractA2APatientContext(root, message, root["configuration"], root["metadata"]),
    },
  };
};

const parseA2AJsonRpcRequest = (raw: unknown): A2AJsonRpcRequest => {
  const root = asRecord(raw);
  if (!root) {
    throw new JsonRpcRequestError(-32600, "Invalid Request: body must be a JSON object.");
  }

  const jsonrpc = toOptionalString(root["jsonrpc"]);
  if (jsonrpc !== "2.0") {
    throw new JsonRpcRequestError(-32600, "Invalid Request: jsonrpc must be '2.0'.");
  }

  const method = toOptionalString(root["method"]);
  if (!method) {
    throw new JsonRpcRequestError(-32600, "Invalid Request: method is required.");
  }

  const params = asRecord(root["params"]) || {};
  const idValue = root["id"];
  const id =
    typeof idValue === "number" || typeof idValue === "string" || idValue === null
      ? idValue
      : null;

  return {
    jsonrpc: "2.0",
    id,
    method,
    params,
  };
};

const parseA2AJsonRpcMessageSend = (request: A2AJsonRpcRequest): ParsedTaskInput => {
  const messageParams = asRecord(request.params["message"]) || request.params;
  const prompt = extractA2AMessagePrompt(messageParams);

  if (!prompt) {
    throw new JsonRpcRequestError(
      -32602,
      "Invalid params: SendMessage requires a message with at least one text prompt part.",
    );
  }

  return {
    inputSurface: "a2a_jsonrpc_params",
    input: {
      prompt,
      patient_context: extractA2APatientContext(
        request.params,
        request.params["configuration"],
        request.params["metadata"],
        messageParams,
      ),
    },
  };
};

const normalizeJsonRpcMethod = (method: string): string => {
  const normalized = method.replace(/\s+/g, "").toLowerCase();
  switch (normalized) {
    case "sendmessage":
    case "message/send":
    case "message:send":
      return "send_message";
    case "sendstreamingmessage":
    case "message/stream":
    case "message:stream":
      return "send_streaming_message";
    case "gettask":
    case "tasks/get":
      return "get_task";
    case "listtasks":
    case "tasks/list":
      return "list_tasks";
    case "canceltask":
    case "tasks/cancel":
      return "cancel_task";
    case "getextendedagentcard":
    case "agent/getauthenticatedextendedcard":
      return "get_extended_agent_card";
    default:
      return "unknown";
  }
};

const detectPromptMode = (prompt: string): TaskRuntimeDiagnostics["prompt_mode"] => {
  const normalized = prompt.toLowerCase();
  if (normalized.includes("hidden risk") || normalized.includes("contradiction")) {
    return "prompt_2";
  }
  if (
    normalized.includes("must happen before discharge") ||
    normalized.includes("transition package")
  ) {
    return "prompt_3";
  }
  return "prompt_1";
};

const buildHealthPayload = () => {
  const allTasks = [...tasks.values()];
  const failedTasks = allTasks.filter((task) => task.status === "failed").length;
  const completedTasks = allTasks.filter((task) => task.status === "completed").length;

  return {
    status: "ok",
    server_name: config.agentName,
    server_version: config.agentVersion,
    po_env: config.poEnv,
    endpoints: {
      healthz: "/healthz",
      readyz: "/readyz",
      agent_card: "/.well-known/agent-card.json",
      rpc: "/rpc",
      message_send: "/message:send",
      message_send_v1: "/v1/message:send",
      tasks: "/tasks",
    },
    task_count: tasks.size,
    task_counters: {
      completed: completedTasks,
      failed: failedTasks,
    },
    dependencies: {
      discharge_gatekeeper_mcp_url: config.dischargeGatekeeperMcpUrl,
      clinical_intelligence_mcp_url: config.clinicalIntelligenceMcpUrl,
    },
    uptime_seconds: Math.floor((Date.now() - startTimeMs) / 1000),
  };
};

const shouldInvokeHiddenRisk = (taskInput: A2ATaskInput): boolean => {
  const narrativeCount = taskInput.patient_context?.narrative_evidence_bundle?.length || 0;
  if (narrativeCount > 0) {
    return true;
  }

  const prompt = taskInput.prompt.toLowerCase();
  return (
    prompt.includes("hidden risk") ||
    prompt.includes("contradiction") ||
    prompt.includes("discharge")
  );
};

const buildFailureFallback = (
  deterministic: ReconciliationResult["deterministic"],
  reason: string,
): ReconciliationResult => {
  const fallbackHiddenRisk = {
    contract_version: "phase0_hidden_risk_v1" as const,
    status: "error" as const,
    patient_id: null,
    encounter_id: null,
    baseline_verdict: deterministic.verdict,
    hidden_risk_summary: {
      result: "inconclusive" as const,
      overall_disposition_impact: "uncertain" as const,
      confidence: "low" as const,
      summary: `clinical_intelligence_unavailable: ${reason}`,
      manual_review_required: true,
      false_positive_guardrail:
        "No hidden-risk findings are fabricated when Clinical Intelligence MCP is unavailable.",
    },
    hidden_risk_findings: [],
    citations: [],
    review_metadata: {
      narrative_sources_reviewed: 0,
      duplicate_findings_suppressed: 0,
      weak_findings_suppressed: 0,
    },
  };

  return reconcileOutputs(
    {
      prompt: "",
    },
    deterministic,
    fallbackHiddenRisk,
  );
};

const withRuntimeDiagnostics = (
  base: ReconciliationResult,
  diagnostics: TaskRuntimeDiagnostics,
): ReconciliationResult => {
  return {
    ...base,
    runtime_diagnostics: diagnostics,
  };
};

const buildDownstreamCorrelation = (
  calls: TaskRuntimeDiagnostics["downstream_calls"],
): TaskRuntimeDiagnostics["downstream_correlation"] => {
  return calls.map((call) => ({
    component: call.component,
    call_id: call.call_id,
    propagated_request_id: call.propagated_headers["x-request-id"] || null,
    propagated_correlation_id: call.propagated_headers["x-correlation-id"] || null,
  }));
};

const buildSkippedClinicalDiagnostic = (
  requestId: string,
  taskId: string,
  promptMode: TaskRuntimeDiagnostics["prompt_mode"],
): TaskRuntimeDiagnostics["downstream_calls"][number] => {
  return {
    call_id: randomUUID(),
    component: "clinical_intelligence_mcp",
    tool_name: "surface_hidden_risks",
    mcp_url: config.clinicalIntelligenceMcpUrl,
    status: "skipped",
    request_id: requestId,
    task_id: taskId,
    started_at: new Date().toISOString(),
    duration_ms: 0,
    propagated_headers: {
      "x-request-id": requestId,
      "request-id": requestId,
      "x-correlation-id": taskId,
      "x-a2a-task-id": taskId,
      "x-a2a-prompt-mode": promptMode,
    },
    http_exchanges: [],
  };
};

const runTask = async (
  taskInput: A2ATaskInput,
  requestId: string,
  taskId: string,
  incomingRequest: IncomingRequestDiagnostic,
): Promise<{ result: ReconciliationResult; diagnostics: TaskRuntimeDiagnostics }> => {
  const taskStartMs = Date.now();
  const executionStartedAt = new Date(taskStartMs).toISOString();
  const downstreamCalls: TaskRuntimeDiagnostics["downstream_calls"] = [];
  const fallbacks: string[] = [];
  const promptMode = detectPromptMode(taskInput.prompt);

  const deterministicInvocation = await invoker.invokeDeterministicReadiness(taskInput, {
    requestId,
    taskId,
    promptMode,
  });
  downstreamCalls.push(deterministicInvocation.diagnostic);
  const deterministic = deterministicInvocation.payload;

  if (!shouldInvokeHiddenRisk(taskInput)) {
    const reconciled = reconcileOutputs(taskInput, deterministic, null);
    const downstreamCallsWithSkipped = [
      ...downstreamCalls,
      buildSkippedClinicalDiagnostic(requestId, taskId, promptMode),
    ];
    const diagnostics: TaskRuntimeDiagnostics = {
      request_id: requestId,
      task_id: taskId,
      prompt_mode: promptMode,
      execution_started_at: executionStartedAt,
      execution_finished_at: new Date().toISOString(),
      task_duration_ms: Date.now() - taskStartMs,
      hidden_risk_invoked: false,
      fallbacks_applied: ["hidden_risk_skipped"],
      incoming_request: incomingRequest,
      downstream_correlation: buildDownstreamCorrelation(downstreamCallsWithSkipped),
      downstream_calls: downstreamCallsWithSkipped,
    };

    return {
      diagnostics,
      result: withRuntimeDiagnostics(
        (() => {
          const presented: ReconciliationResult = {
            ...reconciled,
            hidden_risk_run_status: "skipped",
            contradiction_summary:
              "Narrative review was skipped because no narrative bundle was provided and prompt did not require contradiction analysis.",
          };

          return {
            ...presented,
            prompt_payload: buildPromptPayload(taskInput, presented),
          };
        })(),
        diagnostics,
      ),
    };
  }

  let hiddenRisk: ReconciliationResult["hidden_risk"] = null;
  try {
    const hiddenRiskInvocation = await invoker.invokeHiddenRisk(deterministic, taskInput, {
      requestId,
      taskId,
      promptMode,
    });
    hiddenRisk = hiddenRiskInvocation.payload;
    downstreamCalls.push(hiddenRiskInvocation.diagnostic);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof McpInvocationError) {
      downstreamCalls.push(error.diagnostic);
    }
    fallbacks.push("clinical_intelligence_unavailable");

    const fallback = buildFailureFallback(deterministic, message);
    const diagnostics: TaskRuntimeDiagnostics = {
      request_id: requestId,
      task_id: taskId,
      prompt_mode: promptMode,
      execution_started_at: executionStartedAt,
      execution_finished_at: new Date().toISOString(),
      task_duration_ms: Date.now() - taskStartMs,
      hidden_risk_invoked: true,
      fallbacks_applied: fallbacks,
      incoming_request: incomingRequest,
      downstream_correlation: buildDownstreamCorrelation(downstreamCalls),
      downstream_calls: downstreamCalls,
    };

    return {
      diagnostics,
      result: withRuntimeDiagnostics(
        {
          ...fallback,
          prompt_payload: buildPromptPayload(taskInput, fallback),
        },
        diagnostics,
      ),
    };
  }

  const reconciled = reconcileOutputs(taskInput, deterministic, hiddenRisk);

  try {
    const synthesized = renderBoundedSynthesis(taskInput, reconciled);
    const diagnostics: TaskRuntimeDiagnostics = {
      request_id: requestId,
      task_id: taskId,
      prompt_mode: promptMode,
      execution_started_at: executionStartedAt,
      execution_finished_at: new Date().toISOString(),
      task_duration_ms: Date.now() - taskStartMs,
      hidden_risk_invoked: true,
      fallbacks_applied: fallbacks,
      incoming_request: incomingRequest,
      downstream_correlation: buildDownstreamCorrelation(downstreamCalls),
      downstream_calls: downstreamCalls,
    };

    return {
      diagnostics,
      result: withRuntimeDiagnostics(
        {
          ...reconciled,
          contradiction_summary: synthesized.narrative,
          prompt_payload: synthesized.prompt_payload,
        },
        diagnostics,
      ),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fallbacks.push("bounded_synthesis_fallback");
    const diagnostics: TaskRuntimeDiagnostics = {
      request_id: requestId,
      task_id: taskId,
      prompt_mode: promptMode,
      execution_started_at: executionStartedAt,
      execution_finished_at: new Date().toISOString(),
      task_duration_ms: Date.now() - taskStartMs,
      hidden_risk_invoked: true,
      fallbacks_applied: fallbacks,
      incoming_request: incomingRequest,
      downstream_correlation: buildDownstreamCorrelation(downstreamCalls),
      downstream_calls: downstreamCalls,
    };

    return {
      diagnostics,
      result: withRuntimeDiagnostics(
        (() => {
          const presented: ReconciliationResult = {
            ...reconciled,
            contradiction_summary: `${reconciled.contradiction_summary} Synthesis fallback used: ${message}.`,
          };

          return {
            ...presented,
            prompt_payload: buildPromptPayload(taskInput, presented),
          };
        })(),
        diagnostics,
      ),
    };
  }
};

const buildTaskError = (error: unknown): A2ATaskError => {
  if (error instanceof TaskTimeoutError) {
    return {
      code: "task_timeout",
      message: error.message,
      retryable: true,
      stage: "reconciliation",
    };
  }

  if (error instanceof McpInvocationError) {
    return {
      code: error.code,
      message: error.message,
      retryable: true,
      stage: error.stage,
      details: {
        component: error.diagnostic.component,
        tool_name: error.diagnostic.tool_name,
        mcp_url: error.diagnostic.mcp_url,
        duration_ms: error.diagnostic.duration_ms,
      },
    };
  }

  const message = error instanceof Error ? error.message : String(error);
  return {
    code: "orchestrator_runtime_error",
    message,
    retryable: false,
    stage: "reconciliation",
  };
};

const trimTaskHistory = (): void => {
  if (tasks.size <= MAX_TASK_HISTORY) {
    return;
  }

  const oldest = [...tasks.values()]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(0, tasks.size - MAX_TASK_HISTORY);

  for (const task of oldest) {
    tasks.delete(task.task_id);
  }
};

const appendTaskStatus = (task: A2ATaskRecord, status: A2ATaskRecord["status"]): void => {
  const now = new Date().toISOString();
  task.status = status;
  task.status_history.push({
    status,
    at: now,
  });
};

const buildResponseTaskRecord = (task: A2ATaskRecord) => {
  const terminal = task.status === "completed" || task.status === "failed";
  const outputText = task.output?.contradiction_summary || null;

  return {
    ...task,
    id: task.task_id,
    taskId: task.task_id,
    requestId: task.request_id,
    createdAt: task.created_at,
    completedAt: task.completed_at,
    state: task.status,
    terminal,
    result: task.output,
    output_text: outputText,
    outputText: outputText,
    lifecycle: {
      current_status: task.status,
      terminal,
      history: task.status_history,
    },
  };
};

const buildListTasksResponse = (taskRecords: A2ATaskRecord[]) => {
  return {
    count: taskRecords.length,
    tasks: taskRecords.map(buildResponseTaskRecord),
  };
};

const diagnosticHeaderAllowList = new Set([
  "accept",
  "content-type",
  "user-agent",
  "x-request-id",
  "request-id",
  "x-correlation-id",
  "correlation-id",
  "traceparent",
  "tracestate",
  "x-forwarded-proto",
  "x-forwarded-host",
  "x-forwarded-for",
]);

const collectDiagnosticHeaders = (req: express.Request): Record<string, string> => {
  const result: Record<string, string> = {};

  for (const [name, value] of Object.entries(req.headers)) {
    const normalizedName = name.toLowerCase();
    if (
      !diagnosticHeaderAllowList.has(normalizedName) &&
      !normalizedName.startsWith("x-prompt-opinion-")
    ) {
      continue;
    }

    const values = asStringArray(Array.isArray(value) ? value : [value]);
    if (values.length === 0 && typeof value === "string" && value.trim().length > 0) {
      result[normalizedName] = value.trim();
      continue;
    }

    if (values.length > 0) {
      result[normalizedName] = values.join(", ");
    }
  }

  return result;
};

const buildIncomingRequestDiagnostic = (
  req: express.Request,
  binding: A2AExecutionBinding,
  inputSurface: ParsedTaskInputSurface,
  protocolRequestId: string | null,
  correlationId: string | null,
): IncomingRequestDiagnostic => {
  return {
    selected_binding: binding,
    request_method: req.method,
    request_path: req.path,
    protocol_request_id: protocolRequestId,
    correlation_id: correlationId,
    input_surface: inputSurface,
    content_type: req.get("content-type") || null,
    accept: req.get("accept") || null,
    request_headers: collectDiagnosticHeaders(req),
  };
};

const createTaskRecord = (requestId: string, input: A2ATaskInput): A2ATaskRecord => {
  const taskId = randomUUID();
  const now = new Date().toISOString();
  return {
    task_id: taskId,
    request_id: requestId,
    status: "queued",
    created_at: now,
    completed_at: null,
    status_history: [
      {
        status: "queued",
        at: now,
      },
    ],
    input,
    output: null,
    error: null,
    diagnostics: null,
  };
};

const toA2ATaskState = (status: A2ATaskRecord["status"]): string => {
  switch (status) {
    case "queued":
      return "TASK_STATE_SUBMITTED";
    case "running":
      return "TASK_STATE_WORKING";
    case "completed":
      return "TASK_STATE_COMPLETED";
    case "failed":
      return "TASK_STATE_FAILED";
    default:
      return "TASK_STATE_UNKNOWN";
  }
};

const buildA2ATaskPayload = (task: A2ATaskRecord): Record<string, unknown> => {
  const text =
    task.output?.contradiction_summary ||
    task.output?.prompt_payload?.headline ||
    task.error?.message ||
    "Task accepted.";
  const timestamp = task.completed_at || task.created_at;

  return {
    id: task.task_id,
    contextId: task.input.patient_context?.encounter_id || task.input.patient_context?.patient_id || task.task_id,
    status: {
      state: toA2ATaskState(task.status),
      timestamp,
      message: {
        role: "ROLE_AGENT",
        parts: [{ text }],
        metadata: {
          requestId: task.request_id,
          taskId: task.task_id,
        },
      },
    },
    artifacts:
      task.output
        ? [
            {
              artifactId: `care-transitions-command-${task.task_id}`,
              name: "Care Transitions Command fused response",
              parts: [
                {
                  text: JSON.stringify(task.output),
                },
              ],
            },
          ]
        : [],
    metadata: {
      requestId: task.request_id,
      taskId: task.task_id,
      status: task.status,
      createdAt: task.created_at,
      completedAt: task.completed_at,
      diagnostics: task.diagnostics,
    },
  };
};

const buildA2AHttpJsonSendResponse = (task: A2ATaskRecord): A2AJsonRpcResult => {
  return {
    task: buildA2ATaskPayload(task),
  };
};

const buildJsonRpcSuccess = (
  id: A2AJsonRpcRequest["id"],
  result: A2AJsonRpcResult,
): Record<string, unknown> => {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
};

const buildJsonRpcError = (
  id: A2AJsonRpcRequest["id"],
  code: number,
  message: string,
  data?: Record<string, unknown>,
): Record<string, unknown> => {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      ...(data ? { data } : {}),
    },
  };
};

const executeParsedTaskRequest = async ({
  req,
  parsedTask,
  requestId,
  binding,
  protocolRequestId,
  correlationId,
}: {
  req: express.Request;
  parsedTask: ParsedTaskInput;
  requestId: string;
  binding: A2AExecutionBinding;
  protocolRequestId: string | null;
  correlationId: string | null;
}): Promise<{ taskRecord: A2ATaskRecord; taskSucceeded: boolean }> => {
  const taskRecord = createTaskRecord(requestId, parsedTask.input);
  tasks.set(taskRecord.task_id, taskRecord);
  trimTaskHistory();
  appendTaskStatus(taskRecord, "running");

  log("info", "A2A task execution started", {
    request_id: requestId,
    protocol_request_id: protocolRequestId,
    correlation_id: correlationId,
    task_id: taskRecord.task_id,
    binding,
    method: req.method,
    path: req.path,
    input_surface: parsedTask.inputSurface,
    prompt_preview: parsedTask.input.prompt.slice(0, 80),
  });

  try {
    const incomingRequest = buildIncomingRequestDiagnostic(
      req,
      binding,
      parsedTask.inputSurface,
      protocolRequestId,
      correlationId,
    );
    const runResult = await withTimeout(
      runTask(parsedTask.input, requestId, taskRecord.task_id, incomingRequest),
      config.taskTimeoutMs,
    );

    appendTaskStatus(taskRecord, "completed");
    taskRecord.output = runResult.result;
    taskRecord.diagnostics = runResult.diagnostics;
    taskRecord.completed_at = new Date().toISOString();

    log("info", "A2A task execution finished", {
      request_id: requestId,
      protocol_request_id: protocolRequestId,
      correlation_id: correlationId,
      task_id: taskRecord.task_id,
      binding,
      method: req.method,
      path: req.path,
      final_verdict: runResult.result.final_verdict,
      decision_matrix_row: runResult.result.decision_matrix_row,
      hidden_risk_run_status: runResult.result.hidden_risk_run_status,
      task_duration_ms: runResult.diagnostics.task_duration_ms,
      downstream_call_ids: runResult.diagnostics.downstream_calls.map((call) => call.call_id),
      downstream_mcp_correlation: runResult.diagnostics.downstream_correlation,
    });

    return {
      taskRecord,
      taskSucceeded: true,
    };
  } catch (error) {
    const taskError = buildTaskError(error);
    appendTaskStatus(taskRecord, "failed");
    taskRecord.error = taskError;
    taskRecord.completed_at = new Date().toISOString();

    const downstreamCalls =
      error instanceof McpInvocationError
        ? [error.diagnostic]
        : [];

    taskRecord.diagnostics = {
      request_id: requestId,
      task_id: taskRecord.task_id,
      prompt_mode: detectPromptMode(parsedTask.input.prompt),
      execution_started_at: taskRecord.created_at,
      execution_finished_at: taskRecord.completed_at,
      task_duration_ms:
        new Date(taskRecord.completed_at).getTime() - new Date(taskRecord.created_at).getTime(),
      hidden_risk_invoked: true,
      fallbacks_applied: ["task_failure"],
      incoming_request: buildIncomingRequestDiagnostic(
        req,
        binding,
        parsedTask.inputSurface,
        protocolRequestId,
        correlationId,
      ),
      downstream_correlation: buildDownstreamCorrelation(downstreamCalls),
      downstream_calls: downstreamCalls,
    };

    log("error", "A2A task execution failed", {
      request_id: requestId,
      protocol_request_id: protocolRequestId,
      correlation_id: correlationId,
      task_id: taskRecord.task_id,
      binding,
      method: req.method,
      path: req.path,
      error_code: taskError.code,
      error_message: taskError.message,
      downstream_call_ids: downstreamCalls.map((call) => call.call_id),
    });

    return {
      taskRecord,
      taskSucceeded: false,
    };
  }
};

const toProtocolRequestId = (value: unknown): string | null => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return null;
};

app.use((req, res, next) => {
  const requestId =
    firstNonEmptyString([
      req.headers["x-request-id"],
      req.headers["request-id"],
      req.headers["x-correlation-id"],
      req.headers["correlation-id"],
      extractRequestIdFromBody(req.body),
    ]) || randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  res.setHeader("request-id", requestId);
  res.setHeader("x-correlation-id", requestId);
  res.setHeader("cache-control", "no-store");

  const startedAtMs = Date.now();
  log("info", "HTTP request received", {
    request_id: requestId,
    method: req.method,
    path: req.path,
  });

  res.on("finish", () => {
    log("info", "HTTP request completed", {
      request_id: requestId,
      method: req.method,
      path: req.path,
      status_code: res.statusCode,
      duration_ms: Date.now() - startedAtMs,
    });
  });

  next();
});

app.get("/healthz", (_req, res) => {
  res.status(200).json(buildHealthPayload());
});

app.get("/readyz", (_req, res) => {
  res.status(200).json(buildHealthPayload());
});

app.get("/.well-known/agent-card.json", (req, res) => {
  res.status(200).json(buildAgentCard(config, derivePublicBaseUrl(req)));
});

app.get("/agent-card", (req, res) => {
  res.status(200).json(buildAgentCard(config, derivePublicBaseUrl(req)));
});

const sendTaskValidationError = (res: express.Response, requestId: string, message: string): void => {
  const validationError: A2ATaskError = {
    code: "invalid_task_input",
    message,
    retryable: false,
    stage: "validation",
  };

  log("error", "Task payload validation failed", {
    request_id: requestId,
    error_code: validationError.code,
    error_message: validationError.message,
  });

  res.status(400).json({
    status: "error",
    request_id: requestId,
    error: validationError,
  });
};

const sendHttpJsonUnsupportedStreaming = (res: express.Response): void => {
  res.status(501).json({
    error: {
      code: "streaming_not_supported",
      message:
        "Streaming is disabled for this external A2A orchestrator runtime. Use message:send or /tasks.",
    },
  });
};

app.post("/tasks", async (req, res) => {
  const requestId = String(res.locals.requestId || randomUUID());
  let parsedTask: ParsedTaskInput;

  try {
    parsedTask = parseTaskInput(req.body);
  } catch (error) {
    sendTaskValidationError(
      res,
      requestId,
      error instanceof Error ? error.message : String(error),
    );
    return;
  }

  const correlationId =
    firstNonEmptyString([req.headers["x-correlation-id"], req.headers["correlation-id"]]) ||
    null;
  const executed = await executeParsedTaskRequest({
    req,
    parsedTask,
    requestId,
    binding: "custom_tasks",
    protocolRequestId: null,
    correlationId,
  });

  res.setHeader("location", `/tasks/${executed.taskRecord.task_id}`);
  res.setHeader("x-a2a-task-id", executed.taskRecord.task_id);
  res.status(executed.taskSucceeded ? 201 : 200).json(buildResponseTaskRecord(executed.taskRecord));
});

const handleHttpJsonMessageSend = async (req: express.Request, res: express.Response): Promise<void> => {
  const requestId = String(res.locals.requestId || randomUUID());
  let parsedTask: ParsedTaskInput;

  try {
    parsedTask = parseA2AHttpJsonMessageSend(req.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("error", "A2A HTTP+JSON message/send validation failed", {
      request_id: requestId,
      method: req.method,
      path: req.path,
      error_message: message,
    });
    res.status(400).json({
      error: {
        code: "invalid_request",
        message,
      },
    });
    return;
  }

  const correlationId =
    firstNonEmptyString([req.headers["x-correlation-id"], req.headers["correlation-id"]]) ||
    requestId;
  const executed = await executeParsedTaskRequest({
    req,
    parsedTask,
    requestId,
    binding: "http_json",
    protocolRequestId: null,
    correlationId,
  });

  res.setHeader("x-a2a-task-id", executed.taskRecord.task_id);
  res.status(200).json(buildA2AHttpJsonSendResponse(executed.taskRecord));
};

app.post(/^\/(?:v1\/)?message:send$/, (req, res) => {
  void handleHttpJsonMessageSend(req, res);
});
app.post(/^\/(?:v1\/)?message\/send$/, (req, res) => {
  void handleHttpJsonMessageSend(req, res);
});
app.post(/^\/(?:v1\/)?message:stream$/, (_req, res) => {
  sendHttpJsonUnsupportedStreaming(res);
});
app.post(/^\/(?:v1\/)?message\/stream$/, (_req, res) => {
  sendHttpJsonUnsupportedStreaming(res);
});

const handleJsonRpc = async (req: express.Request, res: express.Response): Promise<void> => {
  let rpc: A2AJsonRpcRequest;
  const requestId = String(res.locals.requestId || randomUUID());
  try {
    rpc = parseA2AJsonRpcRequest(req.body);
  } catch (error) {
    if (error instanceof JsonRpcRequestError) {
      res.status(200).json(buildJsonRpcError(null, error.code, error.message, error.data));
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    res.status(200).json(buildJsonRpcError(null, -32600, message));
    return;
  }

  const normalizedMethod = normalizeJsonRpcMethod(rpc.method);
  const protocolRequestId = toProtocolRequestId(rpc.id);
  const correlationId =
    firstNonEmptyString([req.headers["x-correlation-id"], req.headers["correlation-id"]]) ||
    protocolRequestId ||
    requestId;

  if (normalizedMethod === "send_streaming_message") {
    res
      .status(200)
      .json(
        buildJsonRpcError(
          rpc.id,
          -32004,
          "Unsupported operation: streaming is disabled for this runtime.",
        ),
      );
    return;
  }

  if (normalizedMethod === "get_extended_agent_card") {
    res
      .status(200)
      .json(buildJsonRpcSuccess(rpc.id, { message: buildAgentCard(config, derivePublicBaseUrl(req)) }));
    return;
  }

  if (normalizedMethod === "get_task") {
    const paramsTaskId = firstNonEmptyString([
      rpc.params["id"],
      rpc.params["taskId"],
      rpc.params["task_id"],
    ]);
    if (!paramsTaskId) {
      res.status(200).json(buildJsonRpcError(rpc.id, -32602, "Invalid params: task id is required."));
      return;
    }

    const task = tasks.get(paramsTaskId);
    if (!task) {
      res
        .status(200)
        .json(buildJsonRpcError(rpc.id, -32004, `Task not found: ${paramsTaskId}`));
      return;
    }

    res.status(200).json(buildJsonRpcSuccess(rpc.id, { task: buildA2ATaskPayload(task) }));
    return;
  }

  if (normalizedMethod === "list_tasks") {
    const listed = [...tasks.values()]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((task) => buildA2ATaskPayload(task));

    res.status(200).json(
      buildJsonRpcSuccess(rpc.id, {
        task: {
          list: listed,
          count: listed.length,
        },
      }),
    );
    return;
  }

  if (normalizedMethod === "cancel_task") {
    res
      .status(200)
      .json(
        buildJsonRpcError(
          rpc.id,
          -32004,
          "Unsupported operation: cancel_task is not supported in synchronous mode.",
        ),
      );
    return;
  }

  if (normalizedMethod !== "send_message") {
    res
      .status(200)
      .json(buildJsonRpcError(rpc.id, -32601, `Method not found: ${rpc.method}`));
    return;
  }

  let parsedTask: ParsedTaskInput;
  try {
    parsedTask = parseA2AJsonRpcMessageSend(rpc);
  } catch (error) {
    if (error instanceof JsonRpcRequestError) {
      res.status(200).json(buildJsonRpcError(rpc.id, error.code, error.message, error.data));
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    res.status(200).json(buildJsonRpcError(rpc.id, -32602, message));
    return;
  }

  const executed = await executeParsedTaskRequest({
    req,
    parsedTask,
    requestId,
    binding: "jsonrpc",
    protocolRequestId,
    correlationId,
  });

  res.setHeader("x-a2a-task-id", executed.taskRecord.task_id);
  res.status(200).json(buildJsonRpcSuccess(rpc.id, buildA2AHttpJsonSendResponse(executed.taskRecord)));
};

app.post("/rpc", (req, res) => {
  void handleJsonRpc(req, res);
});
app.post("/", (req, res) => {
  void handleJsonRpc(req, res);
});

app.get("/tasks", (req, res) => {
  const requestIdFilter = req.query.request_id?.toString() || req.query.requestId?.toString();
  const statusFilter = req.query.status?.toString();
  const taskIdFilter = req.query.task_id?.toString() || req.query.taskId?.toString();
  const all = [...tasks.values()]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .filter((task) => (requestIdFilter ? task.request_id === requestIdFilter : true))
    .filter((task) => (taskIdFilter ? task.task_id === taskIdFilter : true))
    .filter((task) => (statusFilter ? task.status === statusFilter : true));

  res.status(200).json(buildListTasksResponse(all));
});

app.get("/tasks/:taskId", (req, res) => {
  const task = tasks.get(req.params.taskId);
  if (!task) {
    res.status(404).json({
      status: "error",
      message: `Unknown task id: ${req.params.taskId}`,
    });
    return;
  }

  res.status(200).json(buildResponseTaskRecord(task));
});

app.get("/v1/tasks", (req, res) => {
  const requestIdFilter = req.query.request_id?.toString() || req.query.requestId?.toString();
  const statusFilter = req.query.status?.toString();
  const taskIdFilter = req.query.task_id?.toString() || req.query.taskId?.toString();
  const all = [...tasks.values()]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .filter((task) => (requestIdFilter ? task.request_id === requestIdFilter : true))
    .filter((task) => (taskIdFilter ? task.task_id === taskIdFilter : true))
    .filter((task) => (statusFilter ? task.status === statusFilter : true));

  res.status(200).json({
    tasks: all.map(buildA2ATaskPayload),
    count: all.length,
  });
});

app.get("/v1/tasks/:taskId", (req, res) => {
  const task = tasks.get(req.params.taskId);
  if (!task) {
    res.status(404).json({
      error: {
        code: "not_found",
        message: `Unknown task id: ${req.params.taskId}`,
      },
    });
    return;
  }

  res.status(200).json({
    task: buildA2ATaskPayload(task),
  });
});

app.listen(config.port, config.host, () => {
  log("info", "external A2A orchestrator listening", {
    host: config.host,
    port: config.port,
    po_env: config.poEnv,
    health_endpoint: `http://localhost:${config.port}/healthz`,
    readyz_endpoint: `http://localhost:${config.port}/readyz`,
    agent_card_endpoint: `http://localhost:${config.port}/.well-known/agent-card.json`,
    rpc_endpoint: `http://localhost:${config.port}/rpc`,
    message_send_endpoint: `http://localhost:${config.port}/message:send`,
    message_send_v1_endpoint: `http://localhost:${config.port}/v1/message:send`,
    tasks_endpoint: `http://localhost:${config.port}/tasks`,
    discharge_gatekeeper_mcp_url: config.dischargeGatekeeperMcpUrl,
    clinical_intelligence_mcp_url: config.clinicalIntelligenceMcpUrl,
  });
});
