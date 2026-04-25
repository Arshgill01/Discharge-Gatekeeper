import assert from "node:assert/strict";
import { spawn, ChildProcess } from "node:child_process";
import { TRAP_PATIENT_TASK_INPUT } from "../orchestrator/fixtures";

const waitForReady = async (url: string, timeoutMs: number): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // wait
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Timed out waiting for ${url}`);
};

const spawnService = (
  name: string,
  command: string,
  args: string[],
  cwd: string,
  env: Record<string, string>,
): ChildProcess => {
  const child = spawn(command, args, {
    cwd,
    env: {
      ...process.env,
      ...env,
    },
    stdio: "ignore",
  });

  child.on("exit", (code) => {
    if (code !== null && code !== 0 && code !== 143) {
      console.error(`[${name}] exited with code ${code}`);
    }
  });

  return child;
};

const run = async (): Promise<void> => {
  const root = process.cwd();
  const dgCwd = `${root}/../typescript`;
  const ciCwd = `${root}/../clinical-intelligence-typescript`;
  const dgPort = "5055";
  const ciPort = "5056";
  const a2aPort = "5057";
  const baseUrl = `http://127.0.0.1:${a2aPort}`;

  const dg = spawnService("discharge", "npx", ["tsx", "index.ts"], dgCwd, {
    PORT: dgPort,
    MCP_SERVER_NAME: "Discharge Gatekeeper MCP",
  });
  const ci = spawnService("clinical", "npx", ["tsx", "index.ts"], ciCwd, {
    PORT: ciPort,
    MCP_SERVER_NAME: "Clinical Intelligence MCP",
    CLINICAL_INTELLIGENCE_PROVIDER: "heuristic",
  });
  const a2a = spawnService("a2a", "npx", ["tsx", "index.ts"], root, {
    PORT: a2aPort,
    DISCHARGE_GATEKEEPER_MCP_URL: `http://127.0.0.1:${dgPort}/mcp`,
    CLINICAL_INTELLIGENCE_MCP_URL: `http://127.0.0.1:${ciPort}/mcp`,
    DEFAULT_STRUCTURED_SCENARIO_ID: "third_synthetic_discharge_slice_ready_v1",
  });

  try {
    await waitForReady(`http://127.0.0.1:${dgPort}/readyz`, 20000);
    await waitForReady(`http://127.0.0.1:${ciPort}/readyz`, 20000);
    await waitForReady(`${baseUrl}/readyz`, 20000);

    const httpJsonResponse = await fetch(`${baseUrl}/message:send`, {
      method: "POST",
      headers: {
        "content-type": "application/a2a+json",
        "x-request-id": "po-http-json-request",
        "x-correlation-id": "po-http-json-correlation",
      },
      body: JSON.stringify({
        message: {
          role: "ROLE_USER",
          parts: [{ text: TRAP_PATIENT_TASK_INPUT.prompt }],
        },
        metadata: {
          patient_context: TRAP_PATIENT_TASK_INPUT.patient_context,
        },
      }),
    });
    assert.equal(httpJsonResponse.status, 200);
    const httpJsonPayload = await httpJsonResponse.json();
    assert.equal(typeof httpJsonPayload?.task?.id, "string");
    assert.equal(httpJsonPayload.task.status.state, "TASK_STATE_COMPLETED");
    assert.equal(
      httpJsonPayload.task.metadata.diagnostics.incoming_request.selected_binding,
      "http_json",
    );
    assert.equal(
      httpJsonPayload.task.metadata.diagnostics.incoming_request.correlation_id,
      "po-http-json-correlation",
    );

    const v1HttpJsonResponse = await fetch(`${baseUrl}/v1/message:send`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: {
          role: "ROLE_USER",
          parts: [{ text: "What hidden risk changed that answer? Show me the contradiction and the evidence." }],
        },
        metadata: {
          patient_context: TRAP_PATIENT_TASK_INPUT.patient_context,
        },
      }),
    });
    assert.equal(v1HttpJsonResponse.status, 200);
    const v1HttpJsonPayload = await v1HttpJsonResponse.json();
    assert.equal(typeof v1HttpJsonPayload?.task?.id, "string");

    const jsonRpcResponse = await fetch(`${baseUrl}/rpc`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": "po-jsonrpc-request",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "po-rpc-id-1",
        method: "SendMessage",
        params: {
          message: {
            role: "ROLE_USER",
            parts: [{ text: TRAP_PATIENT_TASK_INPUT.prompt }],
          },
          metadata: {
            patient_context: TRAP_PATIENT_TASK_INPUT.patient_context,
          },
        },
      }),
    });
    assert.equal(jsonRpcResponse.status, 200);
    const jsonRpcPayload = await jsonRpcResponse.json();
    assert.equal(jsonRpcPayload.jsonrpc, "2.0");
    assert.equal(jsonRpcPayload.id, "po-rpc-id-1");
    assert.equal(typeof jsonRpcPayload.result?.task?.id, "string");
    assert.equal(
      jsonRpcPayload.result.task.metadata.diagnostics.incoming_request.selected_binding,
      "jsonrpc",
    );
    assert.equal(
      jsonRpcPayload.result.task.metadata.diagnostics.incoming_request.protocol_request_id,
      "po-rpc-id-1",
    );

    const slashMethodResponse = await fetch(`${baseUrl}/rpc`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "po-rpc-id-2",
        method: "message/send",
        params: {
          message: {
            role: "ROLE_USER",
            parts: [{ text: "What exactly must happen before discharge, and prepare the transition package." }],
          },
          metadata: {
            patient_context: TRAP_PATIENT_TASK_INPUT.patient_context,
          },
        },
      }),
    });
    assert.equal(slashMethodResponse.status, 200);
    const slashMethodPayload = await slashMethodResponse.json();
    assert.equal(slashMethodPayload.jsonrpc, "2.0");
    assert.equal(slashMethodPayload.id, "po-rpc-id-2");
    assert.equal(slashMethodPayload.result.task.status.state, "TASK_STATE_COMPLETED");
    assert.equal(
      Array.isArray(slashMethodPayload.result.task.metadata.diagnostics.downstream_correlation),
      true,
    );
    assert.equal(
      slashMethodPayload.result.task.metadata.diagnostics.downstream_correlation.length >= 1,
      true,
    );

    const getTaskResponse = await fetch(`${baseUrl}/rpc`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "po-rpc-id-3",
        method: "GetTask",
        params: {
          id: slashMethodPayload.result.task.id,
        },
      }),
    });
    assert.equal(getTaskResponse.status, 200);
    const getTaskPayload = await getTaskResponse.json();
    assert.equal(getTaskPayload.id, "po-rpc-id-3");
    assert.equal(getTaskPayload.result.task.id, slashMethodPayload.result.task.id);

    console.log("PASS prompt opinion compatibility smoke");
  } finally {
    a2a.kill("SIGTERM");
    ci.kill("SIGTERM");
    dg.kill("SIGTERM");
  }
};

void run();
