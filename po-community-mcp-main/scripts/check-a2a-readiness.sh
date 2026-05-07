#!/usr/bin/env bash
set -euo pipefail

EXTERNAL_A2A_BASE_URL="${EXTERNAL_A2A_BASE_URL:-http://127.0.0.1:5057}"
DISCHARGE_GATEKEEPER_HOST="${DISCHARGE_GATEKEEPER_HOST:-127.0.0.1}"
DISCHARGE_GATEKEEPER_PORT="${DISCHARGE_GATEKEEPER_PORT:-5055}"
CLINICAL_INTELLIGENCE_HOST="${CLINICAL_INTELLIGENCE_HOST:-127.0.0.1}"
CLINICAL_INTELLIGENCE_PORT="${CLINICAL_INTELLIGENCE_PORT:-5056}"
EXPECTED_DISCHARGE_GATEKEEPER_MCP_URL="${DISCHARGE_GATEKEEPER_MCP_URL:-http://${DISCHARGE_GATEKEEPER_HOST}:${DISCHARGE_GATEKEEPER_PORT}/mcp}"
EXPECTED_CLINICAL_INTELLIGENCE_MCP_URL="${CLINICAL_INTELLIGENCE_MCP_URL:-http://${CLINICAL_INTELLIGENCE_HOST}:${CLINICAL_INTELLIGENCE_PORT}/mcp}"

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
  -H 'A2A-Version: 1.0' \
  -H 'x-request-id: readiness-rpc' \
  -d '{"jsonrpc":"2.0","id":"readiness-rpc-id","method":"SendMessage","params":{"message":{"role":"ROLE_USER","parts":[{"text":"Is this patient safe to discharge today?"}]}}}' \
  "${EXTERNAL_A2A_BASE_URL}/rpc")"; then
  echo "READINESS FAIL: /rpc endpoint did not accept JSON-RPC SendMessage at ${EXTERNAL_A2A_BASE_URL}/rpc." >&2
  exit 1
fi

if ! message_send_payload="$(curl -sSf \
  -H 'content-type: application/a2a+json' \
  -H 'A2A-Version: 1.0' \
  -H 'x-request-id: readiness-http-json' \
  -d '{"id":"readiness-http-json-id","message":{"role":"ROLE_USER","parts":[{"text":"Is this patient safe to discharge today?"}]}}' \
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
const expectedDgkUrl = process.argv[6];
const expectedCiUrl = process.argv[7];
if (ready.status !== "ok") throw new Error(`readyz status must be ok, got ${ready.status}`);
if (ready.server_name !== "external A2A orchestrator") throw new Error(`server_name mismatch: ${ready.server_name}`);
if (ready.dependencies?.discharge_gatekeeper_mcp_url !== expectedDgkUrl) {
  throw new Error(`readyz dependency mismatch for Discharge Gatekeeper MCP: expected ${expectedDgkUrl}, got ${ready.dependencies?.discharge_gatekeeper_mcp_url}`);
}
if (ready.dependencies?.clinical_intelligence_mcp_url !== expectedCiUrl) {
  throw new Error(`readyz dependency mismatch for Clinical Intelligence MCP: expected ${expectedCiUrl}, got ${ready.dependencies?.clinical_intelligence_mcp_url}`);
}
if (!card.capabilities || !card.capabilities.task_lifecycle) throw new Error("agent card missing task_lifecycle capability");
if ("protocolVersion" in card) throw new Error("agent card must not expose stale top-level protocolVersion in A2A v1 mode");
if (!Array.isArray(card.supportedInterfaces) || card.supportedInterfaces.length === 0) {
  throw new Error("agent card must expose supportedInterfaces[]");
}
if (!card.supportedInterfaces.every((entry) => entry.protocolVersion === "1.0")) {
  throw new Error("agent card supportedInterfaces must advertise A2A protocolVersion 1.0");
}
if (card.supportedInterfaces[0]?.protocolBinding !== "HTTP+JSON") {
  throw new Error("agent card must prefer HTTP+JSON for A2A v1");
}
if (!card.supportedInterfaces[0]?.url?.endsWith("/message:send")) {
  throw new Error("agent card HTTP+JSON interface URL must target /message:send for Prompt Opinion routing");
}
if (!card.endpoints || typeof card.endpoints.message_send !== "string") {
  throw new Error("agent card must expose endpoints.message_send for A2A v1 HTTP+JSON");
}
if (card.capabilities.task_lifecycle.streaming !== false) throw new Error("task_lifecycle.streaming must be false");
if (card.capabilities.task_lifecycle.mode !== "synchronous") throw new Error("task_lifecycle.mode must be synchronous");
if (card.capabilities.extendedAgentCard !== false) throw new Error("agent card capabilities.extendedAgentCard must be false");
if (!card.task_surface || card.task_surface.supports_streaming !== false) throw new Error("task_surface.supports_streaming must be false");
if (typeof card.endpoints.create_task !== "string") throw new Error("agent card missing endpoints.create_task");
if (!Array.isArray(card.capabilities.dependencies) || card.capabilities.dependencies.length !== 2) {
  throw new Error("agent card dependency list must include both MCPs");
}
if (card.capabilities.dependencies[0]?.mcp_endpoint !== expectedDgkUrl) {
  throw new Error(`agent card dependency mismatch for Discharge Gatekeeper MCP: expected ${expectedDgkUrl}, got ${card.capabilities.dependencies[0]?.mcp_endpoint}`);
}
if (card.capabilities.dependencies[1]?.mcp_endpoint !== expectedCiUrl) {
  throw new Error(`agent card dependency mismatch for Clinical Intelligence MCP: expected ${expectedCiUrl}, got ${card.capabilities.dependencies[1]?.mcp_endpoint}`);
}
if (typeof tasks.count !== "number" || !Array.isArray(tasks.tasks)) throw new Error("/tasks payload must expose count and tasks[]");
if (rpcProbe.jsonrpc !== "2.0" || !rpcProbe.result || !rpcProbe.result.task || !rpcProbe.result.task.id) {
  throw new Error("/rpc probe must return JSON-RPC result.task with an id");
}
if (messageSend.jsonrpc !== "2.0" || !messageSend.result || !messageSend.result.task || !messageSend.result.task.id) {
  throw new Error("/message:send probe must return JSON-RPC result.task with an id");
}
console.log("READY PASS: external A2A orchestrator");
' "${tmp_dir}/ready.json" "${tmp_dir}/card.json" "${tmp_dir}/tasks.json" "${tmp_dir}/rpc.json" "${tmp_dir}/message-send.json" "${EXPECTED_DISCHARGE_GATEKEEPER_MCP_URL}" "${EXPECTED_CLINICAL_INTELLIGENCE_MCP_URL}"
