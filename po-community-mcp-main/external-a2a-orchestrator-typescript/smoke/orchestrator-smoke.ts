import assert from "node:assert/strict";
import { spawn, ChildProcess } from "node:child_process";
import {
  ABLATION_TASK_INPUT,
  ALTERNATIVE_HIDDEN_RISK_TASK_INPUT,
  CONTROL_TASK_INPUT,
  DUPLICATE_SIGNAL_TASK_INPUT,
  INCONCLUSIVE_TASK_INPUT,
  TRAP_PATIENT_TASK_INPUT,
} from "../orchestrator/fixtures";

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

const assertAssistiveFraming = (responseText: string, context: string): void => {
  assert.equal(
    responseText.toLowerCase().includes("assistive discharge decision support"),
    true,
    `${context}: response must preserve assistive framing.`,
  );
  assert.equal(
    responseText.toLowerCase().includes("does not replace clinician authority"),
    true,
    `${context}: response must explicitly preserve clinician authority.`,
  );
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
    assert.equal(typeof trapPrompt1Task.request_id, "string");
    assert.equal(typeof trapPrompt1Task.diagnostics?.task_duration_ms, "number");
    assert.equal(Array.isArray(trapPrompt1Task.diagnostics?.downstream_calls), true);
    assert.equal(trapPrompt1Task.output.deterministic.verdict, "ready");
    assert.equal(trapPrompt1Task.output.final_verdict, "not_ready");
    assert.equal(trapPrompt1Task.output.hidden_risk_run_status, "used");
    assert.equal(trapPrompt1Task.output.hidden_risk_result, "hidden_risk_present");
    assert.equal(trapPrompt1Task.output.decision_matrix_row, 3);
    assert.equal(trapPrompt1Task.output.citations.hidden_risk.length > 0, true);

    const ablationTask = await createTask(a2aBaseUrl, ABLATION_TASK_INPUT);
    assert.equal(ablationTask.output.deterministic.verdict, "ready");
    assert.equal(ablationTask.output.final_verdict, "ready");
    assert.equal(ablationTask.output.hidden_risk_run_status, "used");
    assert.equal(ablationTask.output.hidden_risk_result, "no_hidden_risk");
    assert.equal(ablationTask.output.decision_matrix_row, 1);
    assert.equal(
      String(ablationTask.output.contradiction_summary).toLowerCase().includes("from ready to not_ready"),
      false,
      "Ablated note set must not trigger hidden-risk escalation.",
    );

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
    assert.equal(
      String(trapPrompt2Task.output.contradiction_summary).toLowerCase().includes("from ready to not_ready"),
      true,
      "Prompt 2 should make the structured-to-final posture change explicit.",
    );
    assert.equal(
      /(oxygen|desaturation|dyspneic|caregiver)/i.test(String(trapPrompt2Task.output.contradiction_summary)),
      true,
      "Prompt 2 should explicitly mention the hidden-risk concern, not generic escalation.",
    );
    assert.equal(
      String(trapPrompt2Task.output.contradiction_summary).includes("Nursing Note 2026-04-18 20:40"),
      true,
      "Prompt 2 should anchor the canonical nursing contradiction note.",
    );
    assert.equal(
      String(trapPrompt2Task.output.contradiction_summary).includes("Case Management Addendum 2026-04-18 20:55"),
      true,
      "Prompt 2 should carry the reinforcing case-management addendum, not duplicate the same note anchor twice.",
    );
    assert.equal(
      String(trapPrompt2Task.output.contradiction_summary).includes("Before discharge, complete:"),
      false,
      "Prompt 2 should stay contradiction-focused and avoid Prompt 3 transition-package phrasing.",
    );
    assert.equal(
      /(^|\s)\d+\.\s\[[a-z_]+\]/i.test(String(trapPrompt2Task.output.contradiction_summary)),
      false,
      "Prompt 2 should avoid action-list formatting noise.",
    );
    assertAssistiveFraming(String(trapPrompt2Task.output.contradiction_summary), "Prompt 2");

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
    assert.equal(
      String(trapPrompt3Task.output.contradiction_summary).includes("Before discharge, complete:"),
      true,
      "Prompt 3 response should return a concrete transition package.",
    );
    assert.equal(
      String(trapPrompt3Task.output.contradiction_summary)
        .toLowerCase()
        .includes("final posture remains not_ready"),
      true,
      "Prompt 3 package must remain aligned with escalated final posture.",
    );
    assert.equal(
      String(trapPrompt3Task.output.contradiction_summary).includes(
        "Structured baseline 'ready' changed by narrative contradiction",
      ),
      true,
      "Prompt 3 should preserve readable contradiction phrasing without mangled casing.",
    );
    assertAssistiveFraming(String(trapPrompt3Task.output.contradiction_summary), "Prompt 3");

    const alternativeTask = await createTask(a2aBaseUrl, ALTERNATIVE_HIDDEN_RISK_TASK_INPUT);
    assert.equal(alternativeTask.output.deterministic.verdict, "ready");
    assert.equal(alternativeTask.output.final_verdict, "not_ready");
    assert.equal(alternativeTask.output.hidden_risk_run_status, "used");
    assert.equal(alternativeTask.output.hidden_risk_result, "hidden_risk_present");
    assert.equal(alternativeTask.output.decision_matrix_row, 3);
    assert.equal(
      alternativeTask.output.merged_blockers.filter(
        (blocker: { source: string; category: string }) =>
          blocker.source === "hidden_risk" && blocker.category === "home_support_and_services",
      ).length > 0,
      true,
      "Alternative hidden-risk lane should append a home-support hidden-risk blocker.",
    );

    const controlTask = await createTask(a2aBaseUrl, CONTROL_TASK_INPUT);
    assert.equal(controlTask.output.final_verdict, "ready");
    assert.equal(controlTask.output.hidden_risk_run_status, "used");
    assert.equal(controlTask.output.hidden_risk_result, "no_hidden_risk");
    assert.equal(controlTask.output.manual_review_required, false);
    assert.equal(
      controlTask.output.merged_blockers.some((blocker: { source: string }) => blocker.source === "hidden_risk"),
      false,
    );
    assert.equal(
      String(controlTask.output.contradiction_summary).toLowerCase().includes("from ready to not_ready"),
      false,
      "No-hidden-risk path must not over-escalate response narrative.",
    );

    const duplicateSignalTask = await createTask(a2aBaseUrl, DUPLICATE_SIGNAL_TASK_INPUT);
    assert.equal(duplicateSignalTask.output.deterministic.verdict, "not_ready");
    assert.equal(duplicateSignalTask.output.final_verdict, "not_ready");
    assert.equal(duplicateSignalTask.output.hidden_risk_run_status, "used");
    assert.equal(duplicateSignalTask.output.hidden_risk_result, "no_hidden_risk");
    assert.equal(duplicateSignalTask.output.decision_matrix_row, 7);
    assert.equal(
      duplicateSignalTask.output.merged_blockers.some((blocker: { source: string }) => blocker.source === "hidden_risk"),
      false,
      "Duplicate hidden-risk signal should not create extra blockers on top of deterministic blockers.",
    );

    const inconclusiveTask = await createTask(a2aBaseUrl, INCONCLUSIVE_TASK_INPUT);
    assert.equal(inconclusiveTask.output.hidden_risk_run_status, "unavailable");
    assert.equal(inconclusiveTask.output.hidden_risk_result, "inconclusive");
    assert.equal(inconclusiveTask.output.decision_matrix_row, 10);
    assert.equal(inconclusiveTask.output.final_verdict, "ready_with_caveats");
    assert.equal(inconclusiveTask.output.manual_review_required, true);
    assert.equal(
      inconclusiveTask.output.runtime_diagnostics?.hidden_risk_invoked,
      true,
    );
    assert.equal(
      inconclusiveTask.output.runtime_diagnostics?.downstream_calls.some(
        (call: { component: string }) => call.component === "clinical_intelligence_mcp",
      ),
      true,
    );
    assert.equal(
      String(inconclusiveTask.output.contradiction_summary)
        .toLowerCase()
        .includes("manual clinician review is required"),
      true,
      "Inconclusive hidden-risk path should defer with explicit manual review requirement.",
    );
    assert.equal(
      String(inconclusiveTask.output.contradiction_summary)
        .toLowerCase()
        .includes("posture remains ready_with_caveats"),
      true,
      "Inconclusive hidden-risk path should remain bounded to structured posture policy.",
    );
    assertAssistiveFraming(String(inconclusiveTask.output.contradiction_summary), "Inconclusive prompt");

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
      String(unavailableTask.output.hidden_risk_unavailable_reason).includes(
        "clinical_intelligence_unavailable",
      ),
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
