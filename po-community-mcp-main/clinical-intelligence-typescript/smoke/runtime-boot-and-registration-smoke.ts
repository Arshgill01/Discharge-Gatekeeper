import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { request as httpRequest } from "node:http";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import type { Request } from "express";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { REGISTERED_TOOL_NAMES, REGISTERED_TOOLS } from "../tools";
import { ASSESS_RECONCILED_DISCHARGE_READINESS_TOOL_DESCRIPTION } from "../tools/AssessReconciledDischargeReadinessTool";
import { SURFACE_HIDDEN_RISKS_TOOL_DESCRIPTION } from "../tools/SurfaceHiddenRisksTool";
import { SYNTHESIZE_TRANSITION_NARRATIVE_TOOL_DESCRIPTION } from "../tools/SynthesizeTransitionNarrativeTool";

const waitForServerExit = async (serverProcess: ReturnType<typeof spawn>): Promise<void> => {
  if (serverProcess.exitCode !== null) {
    return;
  }
  await once(serverProcess, "exit");
};

const reserveOpenPort = async (): Promise<number> => {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Failed to reserve open port for runtime smoke test."));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
};

const assertToolRegistrationSurface = (): void => {
  assert.deepEqual(
    REGISTERED_TOOL_NAMES,
    [
      "assess_reconciled_discharge_readiness",
      "surface_hidden_risks",
      "synthesize_transition_narrative",
    ],
    "Registered tool names must match canonical Clinical Intelligence MCP tools.",
  );

  const registeredToolNames: string[] = [];
  const descriptions = new Map<string, string>();
  const fakeServer = {
    registerTool: (name: string, config: { description?: string }) => {
      registeredToolNames.push(name);
      descriptions.set(name, config.description || "");
    },
  } as unknown as McpServer;

  for (const tool of REGISTERED_TOOLS) {
    tool.registerTool(fakeServer, {} as Request);
  }

  assert.deepEqual(
    registeredToolNames,
    REGISTERED_TOOL_NAMES,
    `Runtime registration surface must be exactly ${JSON.stringify(REGISTERED_TOOL_NAMES)}.`,
  );
  assert.equal(
    descriptions.get("assess_reconciled_discharge_readiness"),
    ASSESS_RECONCILED_DISCHARGE_READINESS_TOOL_DESCRIPTION,
    "Reconciled readiness tool description should preserve the canonical Prompt 1 routing hint.",
  );
  assert.equal(
    descriptions.get("surface_hidden_risks"),
    SURFACE_HIDDEN_RISKS_TOOL_DESCRIPTION,
    "Hidden-risk tool description should preserve the canonical Prompt 2 routing hint.",
  );
  assert.equal(
    descriptions.get("synthesize_transition_narrative"),
    SYNTHESIZE_TRANSITION_NARRATIVE_TOOL_DESCRIPTION,
    "Transition narrative tool description should preserve the canonical Prompt 3 routing hint.",
  );
};

const waitForHealthPayload = async (
  endpoint: string,
  serverProcess: ReturnType<typeof spawn>,
): Promise<Record<string, unknown>> => {
  const requestPayload = async (): Promise<{ statusCode: number; body: string }> => {
    return await new Promise((resolve, reject) => {
      const req = httpRequest(endpoint, { method: "GET" }, (res) => {
        const chunks: string[] = [];
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode ?? 0,
            body: chunks.join(""),
          });
        });
      });

      req.on("error", reject);
      req.end();
    });
  };

  const deadline = Date.now() + 20000;
  let lastError: unknown;

  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`MCP runtime exited early (exit=${serverProcess.exitCode}).`);
    }

    try {
      const response = await requestPayload();
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return JSON.parse(response.body) as Record<string, unknown>;
      }
      lastError = new Error(`Health endpoint responded with status ${response.statusCode}.`);
    } catch (error) {
      lastError = error;
    }

    await delay(250);
  }

  const errorMessage = lastError instanceof Error ? lastError.message : String(lastError ?? "unknown");
  throw new Error(`Timed out waiting for ${endpoint}. Last error: ${errorMessage}`);
};

const runRuntimeBootCheck = async (): Promise<void> => {
  const port = await reserveOpenPort();
  const endpoint = `http://127.0.0.1:${port}/healthz`;
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];
  const allowedHosts = `localhost,127.0.0.1,localhost:${port},127.0.0.1:${port}`;

  const serverProcess = spawn("npx", ["tsx", "index.ts"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      PO_ENV: "local",
      ALLOWED_HOSTS: allowedHosts,
      CLINICAL_INTELLIGENCE_LLM_PROVIDER: "heuristic",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout?.on("data", (chunk: Buffer | string) => {
    stdoutLines.push(String(chunk));
  });
  serverProcess.stderr?.on("data", (chunk: Buffer | string) => {
    stderrLines.push(String(chunk));
  });

  try {
    const payload = await waitForHealthPayload(endpoint, serverProcess);
    assert.equal(payload["status"], "ok", "Health payload status must be 'ok'.");
    assert.equal(payload["tool_count"], REGISTERED_TOOL_NAMES.length);
    assert.deepEqual(payload["tools"], REGISTERED_TOOL_NAMES);
  } catch (error) {
    const stdout = stdoutLines.join("").trim();
    const stderr = stderrLines.join("").trim();
    const detail = [stdout ? `stdout:\n${stdout}` : "", stderr ? `stderr:\n${stderr}` : ""]
      .filter((line) => line.length > 0)
      .join("\n");
    const baseMessage = error instanceof Error ? error.message : String(error);
    throw new Error(detail.length > 0 ? `${baseMessage}\n${detail}` : baseMessage);
  } finally {
    serverProcess.kill("SIGTERM");
    await waitForServerExit(serverProcess);
  }
};

const main = async (): Promise<void> => {
  assertToolRegistrationSurface();
  await runRuntimeBootCheck();
  console.log("SMOKE PASS: clinical intelligence runtime boot and registration");
};

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
