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

const collectTaskTextParts = (task: Record<string, any>): string[] => {
  const statusParts = Array.isArray(task?.status?.message?.parts)
    ? task.status.message.parts
    : [];
  const artifactParts = Array.isArray(task?.artifacts)
    ? task.artifacts.flatMap((artifact: Record<string, any>) =>
        Array.isArray(artifact?.parts) ? artifact.parts : [],
      )
    : [];

  return [...statusParts, ...artifactParts]
    .map((part: Record<string, any>) => part?.text)
    .filter((text: unknown): text is string => typeof text === "string" && text.trim().length > 0);
};

const assertCompletedPromptOpinionTaskEnvelope = (
  payload: Record<string, any>,
  expectedId: string,
): Record<string, any> => {
  assert.equal(payload.jsonrpc, "2.0");
  assert.equal(payload.id, expectedId);
  assert.equal(typeof payload.result?.task?.id, "string");
  assert.equal(payload.result?.message?.role, "ROLE_AGENT");
  assert.equal(typeof payload.result?.message?.messageId, "string");
  assert.equal(typeof payload.result?.message?.parts?.[0]?.text, "string");
  assert.equal(typeof payload.task?.id, "string");
  assert.equal(payload.task.id, payload.result.task.id);
  assert.ok(
    Buffer.byteLength(JSON.stringify(payload), "utf8") <= 15000,
    "Prompt Opinion message:send response should stay compact",
  );

  const task = payload.result.task;
  assert.equal(typeof task.contextId, "string");
  assert.ok(task.contextId.length > 0);
  assert.equal(typeof task.status, "object");
  assert.equal(task.status.state, "TASK_STATE_COMPLETED");

  const textParts = collectTaskTextParts(task);
  assert.ok(textParts.length >= 1, "task should expose at least one non-empty text part");
  const visibleTaskText = textParts.join("\n");
  assert.match(payload.result.message.parts[0].text, /Final verdict: not_ready|Final transition status:\s*NOT_READY|DISCHARGE HOLD ACTIVE/i);
  assert.match(payload.result.message.parts[0].text, /Nursing Note 2026-04-18 20:40/i);

  assert.match(visibleTaskText, /Final verdict: not_ready|Final transition status:\s*NOT_READY|DISCHARGE HOLD ACTIVE/i);
  assert.match(visibleTaskText, /Structured baseline: ready|Structured baseline:\s*READY|DISCHARGE HOLD ACTIVE/i);
  assert.match(visibleTaskText, /Hidden-risk result: hidden_risk_present|HIDDEN CONTRADICTION FOUND|TRANSITION PACKAGE/i);
  assert.match(visibleTaskText, /Nursing Note 2026-04-18 20:40/i);
  assert.match(visibleTaskText, /Case Management Addendum 2026-04-18 20:55/i);
  assert.match(visibleTaskText, /Care Transitions Command result:|HIDDEN CONTRADICTION FOUND|TRANSITION PACKAGE/i);
  assert.match(visibleTaskText, /Why the answer changed:|Why this changes the answer:|Release condition:/i);
  assert.match(visibleTaskText, /Required before discharge:|Final transition status:|Actions:/i);

  assert.equal(task.metadata?.diagnostics, undefined);
  assert.equal(task.metadata?.output, undefined);
  assert.equal(task.metadata?.runtime_summary, "compact_prompt_opinion_response");
  assert.equal(task.metadata?.both_mcps_hit, true);
  assert.equal(task.metadata?.final_verdict, "not_ready");
  assert.equal(task.metadata?.hidden_risk_result, "hidden_risk_present");
  assert.equal(typeof task.metadata?.diagnostics_available_via, "string");

  return task;
};

const run = async (): Promise<void> => {
  const root = process.cwd();
  const dgCwd = `${root}/../typescript`;
  const ciCwd = `${root}/../clinical-intelligence-typescript`;
  const dgPort = process.env.ORCHESTRATOR_SMOKE_DG_PORT || "5055";
  const ciPort = process.env.ORCHESTRATOR_SMOKE_CI_PORT || "5056";
  const a2aPort = process.env.ORCHESTRATOR_SMOKE_A2A_PORT || "5057";
  const baseUrl = `http://127.0.0.1:${a2aPort}`;

  const dg = spawnService("discharge", "npx", ["tsx", "index.ts"], dgCwd, {
    PORT: dgPort,
    MCP_SERVER_NAME: "Discharge Gatekeeper MCP",
  });
  const ci = spawnService("clinical", "npx", ["tsx", "index.ts"], ciCwd, {
    PORT: ciPort,
    MCP_SERVER_NAME: "Clinical Intelligence MCP",
    CLINICAL_INTELLIGENCE_LLM_PROVIDER: "heuristic",
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
        "A2A-Version": "1.0",
        "x-request-id": "po-http-json-request",
        "x-correlation-id": "po-http-json-correlation",
      },
      body: JSON.stringify({
        id: "po-http-json-id-1",
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
    const httpJsonTask = assertCompletedPromptOpinionTaskEnvelope(
      httpJsonPayload,
      "po-http-json-id-1",
    );
    assert.equal(
      httpJsonTask.metadata.diagnostics_available_via,
      `/tasks/${httpJsonTask.id}`,
    );

    const v1HttpJsonResponse = await fetch(`${baseUrl}/v1/message:send`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "A2A-Version": "1.0",
      },
      body: JSON.stringify({
        id: "po-http-json-id-2",
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
    assertCompletedPromptOpinionTaskEnvelope(v1HttpJsonPayload, "po-http-json-id-2");

    const nestedHttpJsonResponse = await fetch(`${baseUrl}/message:send/v1/message:send`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "A2A-Version": "1.0",
      },
      body: JSON.stringify({
        id: "po-http-json-id-3",
        message: {
          role: "ROLE_USER",
          parts: [{ text: "Is this patient safe to discharge today?" }],
        },
      }),
    });
    assert.equal(nestedHttpJsonResponse.status, 200);
    const nestedHttpJsonPayload = await nestedHttpJsonResponse.json();
    const nestedHttpJsonTask = assertCompletedPromptOpinionTaskEnvelope(
      nestedHttpJsonPayload,
      "po-http-json-id-3",
    );
    assert.equal(typeof nestedHttpJsonTask.status.message.messageId, "string");
    assert.equal(
      nestedHttpJsonTask.status.message.metadata.requestId,
      "po-http-json-id-3",
    );

    const rootHttpJsonResponse = await fetch(`${baseUrl}/`, {
      method: "POST",
      headers: {
        "content-type": "application/a2a+json",
        "A2A-Version": "1.0",
      },
      body: JSON.stringify({
        id: "po-http-json-id-4",
        message: {
          role: "ROLE_USER",
          parts: [{ text: "Is this patient safe to discharge today?" }],
        },
      }),
    });
    assert.equal(rootHttpJsonResponse.status, 200);
    const rootHttpJsonPayload = await rootHttpJsonResponse.json();
    assertCompletedPromptOpinionTaskEnvelope(rootHttpJsonPayload, "po-http-json-id-4");

    const jsonRpcResponse = await fetch(`${baseUrl}/rpc`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "A2A-Version": "1.0",
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
    const jsonRpcTask = assertCompletedPromptOpinionTaskEnvelope(jsonRpcPayload, "po-rpc-id-1");
    assert.equal(
      jsonRpcTask.status.message.metadata.requestId,
      "po-jsonrpc-request",
    );

    const slashMethodResponse = await fetch(`${baseUrl}/rpc`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "A2A-Version": "1.0",
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
    const slashMethodTask = assertCompletedPromptOpinionTaskEnvelope(
      slashMethodPayload,
      "po-rpc-id-2",
    );
    assert.equal(
      slashMethodTask.metadata.diagnostics_available_via,
      `/tasks/${slashMethodTask.id}`,
    );

    const getTaskResponse = await fetch(`${baseUrl}/rpc`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "A2A-Version": "1.0",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "po-rpc-id-3",
        method: "GetTask",
        params: {
          id: slashMethodTask.id,
        },
      }),
    });
    assert.equal(getTaskResponse.status, 200);
    const getTaskPayload = await getTaskResponse.json();
    assert.equal(getTaskPayload.id, "po-rpc-id-3");
    assert.equal(getTaskPayload.result.task.id, slashMethodTask.id);

    console.log("PASS prompt opinion compatibility smoke");
  } finally {
    a2a.kill("SIGTERM");
    ci.kill("SIGTERM");
    dg.kill("SIGTERM");
  }
};

void run();
