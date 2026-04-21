import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const waitForReady = async (url: string, timeoutMs: number): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // ignore until timeout
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${url}`);
};

const run = async (): Promise<void> => {
  const port = "5077";
  const child = spawn("npx", ["tsx", "index.ts"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: port,
      DISCHARGE_GATEKEEPER_MCP_URL: "http://127.0.0.1:5999/mcp",
      CLINICAL_INTELLIGENCE_MCP_URL: "http://127.0.0.1:5998/mcp",
    },
    stdio: "ignore",
  });

  try {
    await waitForReady(`http://127.0.0.1:${port}/readyz`, 15000);
    const readyPayload = await (await fetch(`http://127.0.0.1:${port}/readyz`)).json();
    assert.equal(readyPayload.status, "ok");

    const cardPayload = await (await fetch(`http://127.0.0.1:${port}/.well-known/agent-card.json`)).json();
    assert.equal(cardPayload.schema_version, "a2a_card_v1");
    assert.equal(cardPayload.name, "external A2A orchestrator");
    assert.equal(cardPayload.version, "1.0.0");
    assert.deepEqual(cardPayload.supportedInterfaces, []);
    assert.equal(cardPayload.agent_identity.name, "external A2A orchestrator");
    assert.equal(cardPayload.agent_identity.system, "Care Transitions Command");
    assert.equal(cardPayload.capabilities.task_lifecycle.streaming, false);
    assert.equal(cardPayload.capabilities.task_lifecycle.mode, "synchronous");
    assert.equal(cardPayload.capabilities.task_lifecycle.endpoints.create_task, "/tasks");
    assert.equal(cardPayload.capabilities.task_lifecycle.endpoints.get_task, "/tasks/:taskId");
    assert.equal(cardPayload.capabilities.task_lifecycle.endpoints.list_tasks, "/tasks");
    assert.equal(cardPayload.capabilities.dependencies.length, 2);
    assert.equal(cardPayload.capabilities.dependencies[0].identity, "Discharge Gatekeeper MCP");
    assert.equal(cardPayload.capabilities.dependencies[1].identity, "Clinical Intelligence MCP");

    console.log("PASS runtime + agent card smoke");
  } finally {
    child.kill("SIGTERM");
  }
};

void run();
