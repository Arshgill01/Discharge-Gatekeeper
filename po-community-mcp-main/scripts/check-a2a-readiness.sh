#!/usr/bin/env bash
set -euo pipefail

EXTERNAL_A2A_BASE_URL="${EXTERNAL_A2A_BASE_URL:-http://127.0.0.1:5057}"

ready_payload="$(curl -sSf "${EXTERNAL_A2A_BASE_URL}/readyz")"
card_payload="$(curl -sSf "${EXTERNAL_A2A_BASE_URL}/.well-known/agent-card.json")"

node -e '
const ready = JSON.parse(process.argv[1]);
const card = JSON.parse(process.argv[2]);
if (ready.status !== "ok") throw new Error(`readyz status must be ok, got ${ready.status}`);
if (ready.server_name !== "external A2A orchestrator") throw new Error(`server_name mismatch: ${ready.server_name}`);
if (!card.capabilities || !card.capabilities.task_lifecycle) throw new Error("agent card missing task_lifecycle capability");
if (card.capabilities.task_lifecycle.streaming !== false) throw new Error("task_lifecycle.streaming must be false");
if (!Array.isArray(card.capabilities.dependencies) || card.capabilities.dependencies.length !== 2) {
  throw new Error("agent card dependency list must include both MCPs");
}
console.log("READY PASS: external A2A orchestrator");
' "${ready_payload}" "${card_payload}"
