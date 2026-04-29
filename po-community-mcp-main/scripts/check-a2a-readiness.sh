#!/usr/bin/env bash
set -euo pipefail

EXTERNAL_A2A_BASE_URL="${EXTERNAL_A2A_BASE_URL:-http://127.0.0.1:5057}"

if ! ready_payload="$(curl -sSf "${EXTERNAL_A2A_BASE_URL}/readyz")"; then
  echo "READINESS FAIL: external A2A runtime is unreachable at ${EXTERNAL_A2A_BASE_URL}." >&2
  echo "Hint: start it with ./po-community-mcp-main/scripts/start-a2a-local.sh" >&2
  exit 1
fi

if ! card_payload="$(curl -sSf "${EXTERNAL_A2A_BASE_URL}/.well-known/agent-card.json")"; then
  echo "READINESS FAIL: agent card endpoint is unreachable at ${EXTERNAL_A2A_BASE_URL}/.well-known/agent-card.json." >&2
  exit 1
fi

if ! tasks_payload="$(curl -sSf "${EXTERNAL_A2A_BASE_URL}/tasks")"; then
  echo "READINESS FAIL: /tasks endpoint is unreachable at ${EXTERNAL_A2A_BASE_URL}/tasks." >&2
  exit 1
fi

if ! rpc_probe_payload="$(curl -sSf \
  -H 'content-type: application/json' \
  -H 'x-request-id: readiness-rpc' \
  -d '{"jsonrpc":"2.0","id":"readiness-rpc-id","method":"SendMessage","params":{"message":{"role":"ROLE_USER","parts":[{"text":"Is this patient safe to discharge today?"}]}}}' \
  "${EXTERNAL_A2A_BASE_URL}/rpc")"; then
  echo "READINESS FAIL: /rpc endpoint did not accept JSON-RPC SendMessage at ${EXTERNAL_A2A_BASE_URL}/rpc." >&2
  exit 1
fi

if ! message_send_payload="$(curl -sSf \
  -H 'content-type: application/a2a+json' \
  -H 'x-request-id: readiness-http-json' \
  -d '{"message":{"role":"ROLE_USER","parts":[{"text":"Is this patient safe to discharge today?"}]}}' \
  "${EXTERNAL_A2A_BASE_URL}/message:send")"; then
  echo "READINESS FAIL: /message:send endpoint did not accept HTTP+JSON request at ${EXTERNAL_A2A_BASE_URL}/message:send." >&2
  exit 1
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT

printf '%s' "${ready_payload}" > "${tmp_dir}/ready.json"
printf '%s' "${card_payload}" > "${tmp_dir}/card.json"
printf '%s' "${tasks_payload}" > "${tmp_dir}/tasks.json"
printf '%s' "${rpc_probe_payload}" > "${tmp_dir}/rpc.json"
printf '%s' "${message_send_payload}" > "${tmp_dir}/message-send.json"

node -e '
const fs = require("node:fs");
const ready = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const card = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const tasks = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const rpcProbe = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const messageSend = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
if (ready.status !== "ok") throw new Error(`readyz status must be ok, got ${ready.status}`);
if (ready.server_name !== "external A2A orchestrator") throw new Error(`server_name mismatch: ${ready.server_name}`);
if (!card.capabilities || !card.capabilities.task_lifecycle) throw new Error("agent card missing task_lifecycle capability");
if (card.capabilities.task_lifecycle.streaming !== false) throw new Error("task_lifecycle.streaming must be false");
if (card.capabilities.task_lifecycle.mode !== "synchronous") throw new Error("task_lifecycle.mode must be synchronous");
if (!card.task_surface || card.task_surface.supports_streaming !== false) throw new Error("task_surface.supports_streaming must be false");
if (!card.endpoints || typeof card.endpoints.create_task !== "string") throw new Error("agent card missing endpoints.create_task");
if (!Array.isArray(card.capabilities.dependencies) || card.capabilities.dependencies.length !== 2) {
  throw new Error("agent card dependency list must include both MCPs");
}
if (typeof tasks.count !== "number" || !Array.isArray(tasks.tasks)) throw new Error("/tasks payload must expose count and tasks[]");
if (rpcProbe.jsonrpc !== "2.0" || !rpcProbe.result || !rpcProbe.result.task || !rpcProbe.result.task.id) {
  throw new Error("/rpc probe must return JSON-RPC result.task with an id");
}
if (!messageSend.task || !messageSend.task.id) {
  throw new Error("/message:send probe must return task with an id");
}
console.log("READY PASS: external A2A orchestrator");
' "${tmp_dir}/ready.json" "${tmp_dir}/card.json" "${tmp_dir}/tasks.json" "${tmp_dir}/rpc.json" "${tmp_dir}/message-send.json"
