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

node -e '
const ready = JSON.parse(process.argv[1]);
const card = JSON.parse(process.argv[2]);
const tasks = JSON.parse(process.argv[3]);
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
console.log("READY PASS: external A2A orchestrator");
' "${ready_payload}" "${card_payload}" "${tasks_payload}"
