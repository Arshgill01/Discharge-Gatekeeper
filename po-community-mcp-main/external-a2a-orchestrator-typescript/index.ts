import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { getRuntimeConfig } from "./runtime-config";
import { buildAgentCard } from "./agent-card";
import {
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

type ParsedTaskInput = {
  input: A2ATaskInput;
  inputSurface: ParsedTaskInputSurface;
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
    const diagnostics: TaskRuntimeDiagnostics = {
      request_id: requestId,
      task_id: taskId,
      prompt_mode: promptMode,
      task_duration_ms: Date.now() - taskStartMs,
      hidden_risk_invoked: false,
      fallbacks_applied: ["hidden_risk_skipped"],
      incoming_request: incomingRequest,
      downstream_calls: [...downstreamCalls, buildSkippedClinicalDiagnostic(requestId, taskId, promptMode)],
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
      task_duration_ms: Date.now() - taskStartMs,
      hidden_risk_invoked: true,
      fallbacks_applied: fallbacks,
      incoming_request: incomingRequest,
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
      task_duration_ms: Date.now() - taskStartMs,
      hidden_risk_invoked: true,
      fallbacks_applied: fallbacks,
      incoming_request: incomingRequest,
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
      task_duration_ms: Date.now() - taskStartMs,
      hidden_risk_invoked: true,
      fallbacks_applied: fallbacks,
      incoming_request: incomingRequest,
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

app.post("/tasks", async (req, res) => {
  const requestId = String(res.locals.requestId || randomUUID());
  let parsedTask: ParsedTaskInput;

  try {
    parsedTask = parseTaskInput(req.body);
  } catch (error) {
    const validationMessage = error instanceof Error ? error.message : String(error);
    const validationError: A2ATaskError = {
      code: "invalid_task_input",
      message: validationMessage,
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
    return;
  }

  const taskId = randomUUID();
  const now = new Date().toISOString();
  const taskRecord: A2ATaskRecord = {
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
    input: parsedTask.input,
    output: null,
    error: null,
    diagnostics: null,
  };

  tasks.set(taskId, taskRecord);
  trimTaskHistory();

  appendTaskStatus(taskRecord, "running");
  log("info", "Task accepted", {
    request_id: requestId,
    task_id: taskId,
    input_surface: parsedTask.inputSurface,
    prompt_preview: parsedTask.input.prompt.slice(0, 80),
  });

  try {
    const incomingRequest: IncomingRequestDiagnostic = {
      input_surface: parsedTask.inputSurface,
      content_type: req.get("content-type") || null,
      accept: req.get("accept") || null,
      request_headers: collectDiagnosticHeaders(req),
    };
    const runResult = await withTimeout(
      runTask(parsedTask.input, requestId, taskId, incomingRequest),
      config.taskTimeoutMs,
    );
    appendTaskStatus(taskRecord, "completed");
    taskRecord.output = runResult.result;
    taskRecord.diagnostics = runResult.diagnostics;
    taskRecord.completed_at = new Date().toISOString();

    log("info", "Task completed", {
      request_id: requestId,
      task_id: taskId,
      final_verdict: runResult.result.final_verdict,
      decision_matrix_row: runResult.result.decision_matrix_row,
      hidden_risk_run_status: runResult.result.hidden_risk_run_status,
      task_duration_ms: runResult.diagnostics.task_duration_ms,
    });

    res.setHeader("location", `/tasks/${taskId}`);
    res.setHeader("x-a2a-task-id", taskId);
    res.status(201).json(buildResponseTaskRecord(taskRecord));
    return;
  } catch (error) {
    const taskError = buildTaskError(error);
    appendTaskStatus(taskRecord, "failed");
    taskRecord.error = taskError;
    taskRecord.completed_at = new Date().toISOString();
    taskRecord.diagnostics = {
      request_id: requestId,
      task_id: taskId,
      prompt_mode: detectPromptMode(parsedTask.input.prompt),
      task_duration_ms:
        new Date(taskRecord.completed_at).getTime() - new Date(taskRecord.created_at).getTime(),
      hidden_risk_invoked: true,
      fallbacks_applied: ["task_failure"],
      incoming_request: {
        input_surface: parsedTask.inputSurface,
        content_type: req.get("content-type") || null,
        accept: req.get("accept") || null,
        request_headers: collectDiagnosticHeaders(req),
      },
      downstream_calls:
        error instanceof McpInvocationError
          ? [error.diagnostic]
          : [],
    };

    log("error", "Task failed", {
      request_id: requestId,
      task_id: taskId,
      error_code: taskError.code,
      error_message: taskError.message,
    });

    // Return the failed task record synchronously so callers can inspect the exact failure.
    res.setHeader("location", `/tasks/${taskId}`);
    res.setHeader("x-a2a-task-id", taskId);
    res.status(200).json(buildResponseTaskRecord(taskRecord));
  }
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

app.listen(config.port, config.host, () => {
  log("info", "external A2A orchestrator listening", {
    host: config.host,
    port: config.port,
    po_env: config.poEnv,
    health_endpoint: `http://localhost:${config.port}/healthz`,
    readyz_endpoint: `http://localhost:${config.port}/readyz`,
    agent_card_endpoint: `http://localhost:${config.port}/.well-known/agent-card.json`,
    tasks_endpoint: `http://localhost:${config.port}/tasks`,
    discharge_gatekeeper_mcp_url: config.dischargeGatekeeperMcpUrl,
    clinical_intelligence_mcp_url: config.clinicalIntelligenceMcpUrl,
  });
});
