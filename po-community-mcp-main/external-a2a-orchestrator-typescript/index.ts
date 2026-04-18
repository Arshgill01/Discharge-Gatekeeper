import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { getRuntimeConfig } from "./runtime-config";
import { buildAgentCard } from "./agent-card";

type TaskRecord = {
  task_id: string;
  status: "queued" | "running" | "completed";
  created_at: string;
  completed_at: string | null;
  input: unknown;
  output: unknown;
};

const config = getRuntimeConfig(process.env as Record<string, string | undefined>);
const app = express();
const startTimeMs = Date.now();
const tasks = new Map<string, TaskRecord>();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

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
  uptime_seconds: Math.floor((Date.now() - startTimeMs) / 1000),
});

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
  const taskId = randomUUID();
  const now = new Date().toISOString();
  const task: TaskRecord = {
    task_id: taskId,
    status: "completed",
    created_at: now,
    completed_at: now,
    input: req.body,
    output: {
      status: "not_implemented",
      message: "Task lifecycle scaffold is active; orchestration will be wired in the next commit.",
    },
  };

  tasks.set(taskId, task);
  res.status(201).json(task);
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
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      message: "external A2A orchestrator listening",
      host: config.host,
      port: config.port,
      health_endpoint: `http://localhost:${config.port}/healthz`,
      agent_card_endpoint: `http://localhost:${config.port}/.well-known/agent-card.json`,
      tasks_endpoint: `http://localhost:${config.port}/tasks`,
    }),
  );
});
