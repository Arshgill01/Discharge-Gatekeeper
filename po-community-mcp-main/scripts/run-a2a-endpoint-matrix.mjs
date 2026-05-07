#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const baseUrl = (process.env.A2A_ENDPOINT_MATRIX_BASE_URL || "http://127.0.0.1:5057").replace(/\/+$/, "");
const runId = process.env.PROMPT_OPINION_E2E_RUN_ID || "20260507T-po-task-rendering-recovery";
const runDir =
  process.env.PROMPT_OPINION_E2E_RUN_DIR ||
  path.join("output", "prompt-opinion-e2e", "runs", runId);
const reportsDir = path.join(runDir, "reports");
const reportPath = path.join(reportsDir, "a2a-endpoint-matrix.md");

fs.mkdirSync(reportsDir, { recursive: true });

const prompt =
  "Use the selected external A2A agent for this question. Do not answer directly. Forward the case to Care Transitions Command: is this patient safe to discharge today?";

const httpJsonBody = {
  id: "endpoint-matrix-message-send",
  message: {
    role: "ROLE_USER",
    parts: [{ text: prompt }],
  },
};

const rpcBody = (method, id) => ({
  jsonrpc: "2.0",
  id,
  method,
  params: {
    message: {
      role: "ROLE_USER",
      parts: [{ text: prompt }],
    },
  },
});

const probes = [
  { label: "/message:send", path: "/message:send", body: httpJsonBody },
  { label: "/v1/message:send", path: "/v1/message:send", body: httpJsonBody },
  {
    label: "/message:send/v1/message:send",
    path: "/message:send/v1/message:send",
    body: httpJsonBody,
  },
  { label: "/rpc SendMessage", path: "/rpc", body: rpcBody("SendMessage", "endpoint-matrix-rpc-send-message") },
  { label: "/rpc message/send", path: "/rpc", body: rpcBody("message/send", "endpoint-matrix-rpc-message-send") },
];

const size = (value) =>
  Buffer.byteLength(typeof value === "string" ? value : JSON.stringify(value ?? {}), "utf8");

const analyze = async (probe) => {
  const response = await fetch(`${baseUrl}${probe.path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": probe.label.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase(),
    },
    body: JSON.stringify(probe.body),
  });
  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = null;
  }
  const task = payload?.result?.task;
  const text = raw;

  return {
    endpoint: probe.label,
    http_status: response.status,
    content_type: contentType,
    bytes_total: size(raw),
    has_result_task: Boolean(task),
    has_top_level_task: Boolean(payload?.task),
    status_state: task?.status?.state || "",
    includes_not_ready: text.includes("not_ready"),
    includes_nursing: text.includes("Nursing Note 2026-04-18 20:40"),
    includes_case_management: text.includes("Case Management Addendum 2026-04-18 20:55"),
  };
};

const rows = [];
for (const probe of probes) {
  rows.push(await analyze(probe));
}

const markdown = [
  "# A2A endpoint matrix",
  "",
  `- Base URL: \`${baseUrl}\``,
  `- Generated at: \`${new Date().toISOString()}\``,
  "",
  "| Endpoint | HTTP status | Content-Type | Bytes | result.task | top-level task | State | not_ready | Nursing anchor | Case management anchor |",
  "| --- | ---: | --- | ---: | --- | --- | --- | --- | --- | --- |",
  ...rows.map(
    (row) =>
      `| \`${row.endpoint}\` | ${row.http_status} | \`${row.content_type}\` | ${row.bytes_total} | ${row.has_result_task} | ${row.has_top_level_task} | \`${row.status_state}\` | ${row.includes_not_ready} | ${row.includes_nursing} | ${row.includes_case_management} |`,
  ),
  "",
].join("\n");

fs.writeFileSync(reportPath, markdown);
console.log(markdown);
