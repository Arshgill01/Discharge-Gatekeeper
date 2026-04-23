import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { getRuntimeConfig } from "./runtime-config";
import { buildAgentCard } from "./agent-card";
import {
  A2ATaskError,
  A2ATaskInput,
  A2ATaskRecord,
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
  inputSurface: "root" | "input_envelope";
};

const derivePublicBaseUrl = (req: express.Request): string => {
  const forwardedProto = req.headers["x-forwarded-proto"]?.toString();
  const forwardedHost = req.headers["x-forwarded-host"]?.toString();
  const protocol = forwardedProto || req.protocol || "http";
  const host = forwardedHost || req.get("host") || `127.0.0.1:${config.port}`;
  return `${protocol}://${host}`;
};

app.use(cors());
app.use(express.json({ limit: "1mb" }));

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

const firstNonEmptyString = (values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};

const parseTaskInput = (raw: unknown): ParsedTaskInput => {
  const root = asRecord(raw);
  if (!root) {
    throw new Error("Task payload must be a JSON object.");
  }

  const envelopeInput = asRecord(root["input"]);
  const payload = envelopeInput || root;
  const inputSurface: ParsedTaskInput["inputSurface"] = envelopeInput ? "input_envelope" : "root";

  const prompt = firstNonEmptyString([
    payload["prompt"],
    payload["user_prompt"],
    payload["query"],
    root["prompt"],
  ]);

  if (!prompt) {
    throw new Error(
      "Task payload must include a non-empty prompt at 'prompt' or 'input.prompt'.",
    );
  }

  const patientContextRaw = payload["patient_context"] ?? root["patient_context"];
  const patientContext = asRecord(patientContextRaw);

  return {
    inputSurface,
    input: {
      prompt,
      patient_context: patientContext
        ? (patientContext as A2ATaskInput["patient_context"])
        : undefined,
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

const runTask = async (
  taskInput: A2ATaskInput,
  requestId: string,
): Promise<{ result: ReconciliationResult; diagnostics: TaskRuntimeDiagnostics }> => {
  const taskStartMs = Date.now();
  const downstreamCalls: TaskRuntimeDiagnostics["downstream_calls"] = [];
  const fallbacks: string[] = [];
  const promptMode = detectPromptMode(taskInput.prompt);

  const deterministicInvocation = await invoker.invokeDeterministicReadiness(taskInput);
  downstreamCalls.push(deterministicInvocation.diagnostic);
  const deterministic = deterministicInvocation.payload;

  if (!shouldInvokeHiddenRisk(taskInput)) {
    const reconciled = reconcileOutputs(taskInput, deterministic, null);
    const diagnostics: TaskRuntimeDiagnostics = {
      request_id: requestId,
      prompt_mode: promptMode,
      task_duration_ms: Date.now() - taskStartMs,
      hidden_risk_invoked: false,
      fallbacks_applied: ["hidden_risk_skipped"],
      downstream_calls: [
        ...downstreamCalls,
        {
          component: "clinical_intelligence_mcp",
          tool_name: "surface_hidden_risks",
          mcp_url: config.clinicalIntelligenceMcpUrl,
          status: "skipped",
          started_at: new Date().toISOString(),
          duration_ms: 0,
        },
      ],
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
    const hiddenRiskInvocation = await invoker.invokeHiddenRisk(deterministic, taskInput);
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
      prompt_mode: promptMode,
      task_duration_ms: Date.now() - taskStartMs,
      hidden_risk_invoked: true,
      fallbacks_applied: fallbacks,
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
      prompt_mode: promptMode,
      task_duration_ms: Date.now() - taskStartMs,
      hidden_risk_invoked: true,
      fallbacks_applied: fallbacks,
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
      prompt_mode: promptMode,
      task_duration_ms: Date.now() - taskStartMs,
      hidden_risk_invoked: true,
      fallbacks_applied: fallbacks,
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

app.use((req, res, next) => {
  const requestId = req.headers["x-request-id"]?.toString() || randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("x-request-id", requestId);

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
    input: parsedTask.input,
    output: null,
    error: null,
    diagnostics: null,
  };

  tasks.set(taskId, taskRecord);
  trimTaskHistory();

  taskRecord.status = "running";
  log("info", "Task accepted", {
    request_id: requestId,
    task_id: taskId,
    input_surface: parsedTask.inputSurface,
    prompt_preview: parsedTask.input.prompt.slice(0, 80),
  });

  try {
    const runResult = await withTimeout(
      runTask(parsedTask.input, requestId),
      config.taskTimeoutMs,
    );
    taskRecord.status = "completed";
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

    res.status(201).json(taskRecord);
    return;
  } catch (error) {
    const taskError = buildTaskError(error);
    taskRecord.status = "failed";
    taskRecord.error = taskError;
    taskRecord.completed_at = new Date().toISOString();
    taskRecord.diagnostics = {
      request_id: requestId,
      prompt_mode: detectPromptMode(parsedTask.input.prompt),
      task_duration_ms:
        new Date(taskRecord.completed_at).getTime() - new Date(taskRecord.created_at).getTime(),
      hidden_risk_invoked: true,
      fallbacks_applied: ["task_failure"],
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
    res.status(200).json(taskRecord);
  }
});

app.get("/tasks", (req, res) => {
  const requestIdFilter = req.query.request_id?.toString();
  const statusFilter = req.query.status?.toString();
  const all = [...tasks.values()]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .filter((task) => (requestIdFilter ? task.request_id === requestIdFilter : true))
    .filter((task) => (statusFilter ? task.status === statusFilter : true));

  res.status(200).json({
    count: all.length,
    tasks: all,
  });
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

  res.status(200).json(task);
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
