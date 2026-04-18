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
    assert.equal(cardPayload.agent_identity.name, "external A2A orchestrator");
    assert.equal(cardPayload.capabilities.task_lifecycle.streaming, false);
    assert.equal(cardPayload.capabilities.dependencies.length, 2);

    console.log("PASS runtime + agent card smoke");
  } finally {
    child.kill("SIGTERM");
  }
};

void run();
