import assert from "node:assert/strict";
import { spawn, ChildProcess } from "node:child_process";
import { TRAP_PATIENT_TASK_INPUT, CONTROL_TASK_INPUT } from "../orchestrator/fixtures";

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

const spawnService = (name: string, command: string, args: string[], cwd: string, env: Record<string, string>): ChildProcess => {
  const child = spawn(command, args, {
    cwd,
    env: {
      ...process.env,
      ...env,
    },
    stdio: "ignore",
  });

  child.on("exit", (code) => {
    if (code !== null && code !== 0) {
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
  const a2aFallbackPort = "5058";

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
    await waitForReady(`http://127.0.0.1:${a2aPort}/readyz`, 20000);

    const trapResponse = await fetch(`http://127.0.0.1:${a2aPort}/tasks`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(TRAP_PATIENT_TASK_INPUT),
    });
    assert.equal(trapResponse.status, 201);
    const trapTask = await trapResponse.json();

    assert.equal(trapTask.status, "completed");
    assert.equal(trapTask.output.deterministic.verdict, "ready");
    assert.equal(trapTask.output.final_verdict, "not_ready");
    assert.equal(trapTask.output.hidden_risk_run_status, "used");
    assert.equal(trapTask.output.decision_matrix_row, 3);
    assert.equal(trapTask.output.citations.hidden_risk.length > 0, true);

    const controlResponse = await fetch(`http://127.0.0.1:${a2aPort}/tasks`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(CONTROL_TASK_INPUT),
    });
    assert.equal(controlResponse.status, 201);
    const controlTask = await controlResponse.json();
    assert.equal(controlTask.output.final_verdict, "ready");

    const synthesisFallbackResponse = await fetch(`http://127.0.0.1:${a2aPort}/tasks`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ...TRAP_PATIENT_TASK_INPUT,
        prompt: "What hidden risk changed the answer?",
        patient_context: {
          ...TRAP_PATIENT_TASK_INPUT.patient_context,
          narrative_evidence_bundle: TRAP_PATIENT_TASK_INPUT.patient_context?.narrative_evidence_bundle,
        },
      }),
    });
    assert.equal(synthesisFallbackResponse.status, 201);

    a2a.kill("SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 600));

    const a2aWithUnavailableClinical = spawnService("a2a-fallback", "npx", ["tsx", "index.ts"], root, {
      PORT: a2aFallbackPort,
      DISCHARGE_GATEKEEPER_MCP_URL: `http://127.0.0.1:${dgPort}/mcp`,
      CLINICAL_INTELLIGENCE_MCP_URL: "http://127.0.0.1:5998/mcp",
      DEFAULT_STRUCTURED_SCENARIO_ID: "third_synthetic_discharge_slice_ready_v1",
      A2A_FORCE_SYNTHESIS_ERROR: "1",
    });

    await waitForReady(`http://127.0.0.1:${a2aFallbackPort}/readyz`, 20000);
    const unavailableResponse = await fetch(`http://127.0.0.1:${a2aFallbackPort}/tasks`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(TRAP_PATIENT_TASK_INPUT),
    });
    assert.equal(unavailableResponse.status, 201);
    const unavailableTask = await unavailableResponse.json();
    assert.equal(unavailableTask.output.hidden_risk_run_status, "unavailable");
    assert.equal(unavailableTask.output.final_verdict, "ready_with_caveats");
    assert.equal(
      String(unavailableTask.output.hidden_risk_unavailable_reason).includes("clinical_intelligence_unavailable"),
      true,
    );

    a2aWithUnavailableClinical.kill("SIGTERM");

    console.log("PASS orchestrator smoke");
  } finally {
    a2a.kill("SIGTERM");
    ci.kill("SIGTERM");
    dg.kill("SIGTERM");
  }
};

void run();
