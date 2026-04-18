import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { getRuntimeConfig } from "./runtime-config";
import { buildAgentCard } from "./agent-card";
import { A2ATaskInput, A2ATaskRecord, ReconciliationResult } from "./types";
import { McpToolInvoker } from "./mcp/invoker";
import { reconcileOutputs } from "./orchestrator/reconcile";

const config = getRuntimeConfig(process.env as Record<string, string | undefined>);
const app = express();
const startTimeMs = Date.now();
const tasks = new Map<string, A2ATaskRecord>();
const invoker = new McpToolInvoker(config);

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
        timer = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs} ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const parseTaskInput = (raw: unknown): A2ATaskInput => {
  if (!raw || typeof raw !== "object") {
    throw new Error("Task payload must be an object.");
  }

  const prompt = (raw as { prompt?: unknown }).prompt;
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    throw new Error("Task payload must include a non-empty 'prompt' string.");
  }

  const patientContext = (raw as { patient_context?: unknown }).patient_context;

  return {
    prompt,
    patient_context: patientContext && typeof patientContext === "object"
      ? (patientContext as A2ATaskInput["patient_context"])
      : undefined,
  };
};

const buildHealthPayload = () => ({
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
  dependencies: {
    discharge_gatekeeper_mcp_url: config.dischargeGatekeeperMcpUrl,
    clinical_intelligence_mcp_url: config.clinicalIntelligenceMcpUrl,
  },
  uptime_seconds: Math.floor((Date.now() - startTimeMs) / 1000),
});

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

const runTask = async (taskInput: A2ATaskInput): Promise<ReconciliationResult> => {
  const deterministic = await invoker.invokeDeterministicReadiness(taskInput);

  if (!shouldInvokeHiddenRisk(taskInput)) {
    const reconciled = reconcileOutputs(taskInput, deterministic, null);
    return {
      ...reconciled,
      hidden_risk_run_status: "skipped",
      contradiction_summary:
        "Narrative review was skipped because no narrative bundle was provided and prompt did not require contradiction analysis.",
    };
  }

  const hiddenRisk = await invoker.invokeHiddenRisk(deterministic, taskInput);
  return reconcileOutputs(taskInput, deterministic, hiddenRisk);
};

app.get("/healthz", (_req, res) => {
  res.status(200).json(buildHealthPayload());
});

app.get("/readyz", (_req, res) => {
  res.status(200).json(buildHealthPayload());
});

app.get("/.well-known/agent-card.json", (_req, res) => {
  res.status(200).json(buildAgentCard(config));
});

app.get("/agent-card", (_req, res) => {
  res.status(200).json(buildAgentCard(config));
});

app.post("/tasks", async (req, res) => {
  const requestId = req.headers["x-request-id"]?.toString() || randomUUID();

  try {
    const input = parseTaskInput(req.body);
    const taskId = randomUUID();
    const now = new Date().toISOString();
    const taskRecord: A2ATaskRecord = {
      task_id: taskId,
      status: "queued",
      created_at: now,
      completed_at: null,
      input,
      output: null,
      error: null,
    };
    tasks.set(taskId, taskRecord);

    taskRecord.status = "running";
    const result = await withTimeout(runTask(input), config.taskTimeoutMs);
    taskRecord.status = "completed";
    taskRecord.output = result;
    taskRecord.completed_at = new Date().toISOString();

    res.status(201).json(taskRecord);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("error", "Task failed", {
      request_id: requestId,
      error_message: message,
    });

    res.status(400).json({
      status: "error",
      message,
    });
  }
});

app.get("/tasks", (_req, res) => {
  const all = [...tasks.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
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
