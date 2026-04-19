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

const createTask = async (baseUrl: string, payload: unknown): Promise<any> => {
  const response = await fetch(`${baseUrl}/tasks`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  assert.equal(response.status, 201);
  return response.json();
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

    const a2aBaseUrl = `http://127.0.0.1:${a2aPort}`;
    const trapPrompt1Task = await createTask(a2aBaseUrl, TRAP_PATIENT_TASK_INPUT);

    assert.equal(trapPrompt1Task.status, "completed");
    assert.equal(trapPrompt1Task.output.deterministic.verdict, "ready");
    assert.equal(trapPrompt1Task.output.final_verdict, "not_ready");
    assert.equal(trapPrompt1Task.output.hidden_risk_run_status, "used");
    assert.equal(trapPrompt1Task.output.decision_matrix_row, 3);
    assert.equal(trapPrompt1Task.output.citations.hidden_risk.length > 0, true);

    const trapPrompt2Task = await createTask(a2aBaseUrl, {
      ...TRAP_PATIENT_TASK_INPUT,
      prompt: "What hidden risk changed that answer? Show me the contradiction and the evidence.",
    });
    assert.equal(trapPrompt2Task.output.final_verdict, "not_ready");
    assert.equal(trapPrompt2Task.output.hidden_risk_run_status, "used");
    assert.equal(
      String(trapPrompt2Task.output.contradiction_summary).toLowerCase().includes("contradiction"),
      true,
    );
    assert.equal(trapPrompt2Task.output.citations.hidden_risk.length > 0, true);

    const trapPrompt3Task = await createTask(a2aBaseUrl, {
      ...TRAP_PATIENT_TASK_INPUT,
      prompt: "What exactly must happen before discharge, and prepare the transition package.",
    });
    assert.equal(trapPrompt3Task.output.final_verdict, "not_ready");
    assert.equal(trapPrompt3Task.output.hidden_risk_run_status, "used");
    assert.equal(
      trapPrompt3Task.output.merged_next_steps.some((step: { source: string }) => step.source === "hidden_risk"),
      true,
    );

    const controlTask = await createTask(a2aBaseUrl, CONTROL_TASK_INPUT);
    assert.equal(controlTask.output.final_verdict, "ready");
    assert.equal(controlTask.output.hidden_risk_run_status, "used");
    assert.equal(controlTask.output.hidden_risk_result, "no_hidden_risk");
    assert.equal(
      controlTask.output.merged_blockers.some((blocker: { source: string }) => blocker.source === "hidden_risk"),
      false,
    );

    const insufficientContextTask = await createTask(a2aBaseUrl, {
      prompt: "What hidden risks or contradictions change that answer?",
      patient_context: {
        scenario_id: "third_synthetic_discharge_slice_ready_v1",
        patient_id: "phase0-insufficient-context",
        encounter_id: "enc-phase0-insufficient-context",
        narrative_evidence_bundle: [],
      },
    });
    assert.equal(insufficientContextTask.output.hidden_risk_run_status, "unavailable");
    assert.equal(insufficientContextTask.output.hidden_risk_result, "inconclusive");
    assert.equal(insufficientContextTask.output.decision_matrix_row, 10);
    assert.equal(insufficientContextTask.output.final_verdict, "ready_with_caveats");
    assert.equal(insufficientContextTask.output.manual_review_required, true);

    const synthesisFallbackTask = await createTask(a2aBaseUrl, {
      ...TRAP_PATIENT_TASK_INPUT,
      prompt: "What hidden risk changed the answer?",
      patient_context: {
        ...TRAP_PATIENT_TASK_INPUT.patient_context,
        narrative_evidence_bundle: TRAP_PATIENT_TASK_INPUT.patient_context?.narrative_evidence_bundle,
      },
    });
    assert.equal(synthesisFallbackTask.output.final_verdict, "not_ready");

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
    const unavailableTask = await createTask(`http://127.0.0.1:${a2aFallbackPort}`, TRAP_PATIENT_TASK_INPUT);
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
