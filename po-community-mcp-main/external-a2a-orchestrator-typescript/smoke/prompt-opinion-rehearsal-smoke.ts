import assert from "node:assert/strict";
import { spawn, ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CONTROL_TASK_INPUT, TRAP_PATIENT_TASK_INPUT } from "../orchestrator/fixtures";

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

const withMcpClient = async <T>(
  mcpUrl: string,
  action: (client: Client) => Promise<T>,
): Promise<T> => {
  const client = new Client(
    {
      name: "prompt-opinion-rehearsal-smoke",
      version: "1.0.0",
    },
    {
      capabilities: {},
    },
  );

  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
  await client.connect(transport);
  try {
    return await action(client);
  } finally {
    await client.close();
  }
};

const parseToolPayload = (toolResult: any): any => {
  const textItem = toolResult?.content?.find((item: any) => item?.type === "text");
  if (!textItem?.text) {
    throw new Error("MCP tool response missing text output.");
  }
  return JSON.parse(textItem.text);
};

const createRunId = (): string =>
  new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

const writeJson = (filePath: string, payload: unknown): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
};

const renderTimedResultsMarkdown = (report: {
  generated_at: string;
  run_id: string;
  a2a_rehearsals: Array<{
    run: number;
    totalElapsedMs: number;
    promptResults: Array<{ prompt: string; elapsedMs: number }>;
  }>;
}): string => {
  const lines = [
    "# Timed Rehearsal Results",
    "",
    "## Generated at",
    report.generated_at,
    "",
    "## Run ID",
    `\`${report.run_id}\``,
    "",
  ];

  for (const rehearsal of report.a2a_rehearsals) {
    lines.push(`## A2A Run ${rehearsal.run}`);
    lines.push("| Prompt | Time (ms) |");
    lines.push("| --- | --- |");
    for (const promptResult of rehearsal.promptResults) {
      lines.push(`| ${promptResult.prompt} | ${promptResult.elapsedMs} |`);
    }
    lines.push(`| **Total** | **${rehearsal.totalElapsedMs}** |`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
};

const buildDeterministicSnapshot = (deterministic: any) => ({
  patient_id: TRAP_PATIENT_TASK_INPUT.patient_context?.patient_id || null,
  encounter_id: TRAP_PATIENT_TASK_INPUT.patient_context?.encounter_id || null,
  baseline_verdict: deterministic.verdict,
  deterministic_blockers: deterministic.blockers.map((blocker: any) => ({
    blocker_id: blocker.id,
    category: blocker.category,
    description: blocker.description,
    severity: blocker.priority,
  })),
  deterministic_evidence: deterministic.evidence.map((evidence: any) => ({
    evidence_id: evidence.id,
    source_label: evidence.source_label,
    detail: evidence.detail,
  })),
  deterministic_next_steps: deterministic.next_steps.map((step: any) => step.action),
  deterministic_summary: deterministic.summary,
});

const run = async (): Promise<void> => {
  const root = process.cwd();
  const dgCwd = `${root}/../typescript`;
  const ciCwd = `${root}/../clinical-intelligence-typescript`;
  const outputDir = process.env.PROMPT_OPINION_E2E_OUTPUT_DIR
    ? path.resolve(process.env.PROMPT_OPINION_E2E_OUTPUT_DIR)
    : path.resolve(root, "../../output/prompt-opinion-e2e");
  const runId = process.env.PROMPT_OPINION_E2E_RUN_ID || createRunId();
  const runDir = path.join(outputDir, "runs", runId);
  const runReportsDir = path.join(runDir, "reports");
  const runRawDir = path.join(runDir, "raw");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(runReportsDir, { recursive: true });
  fs.mkdirSync(runRawDir, { recursive: true });

  const dgPort = "5055";
  const ciPort = "5056";
  const a2aPort = "5057";
  const a2aBaseUrl = `http://127.0.0.1:${a2aPort}`;
  const dgMcpUrl = `http://127.0.0.1:${dgPort}/mcp`;
  const ciMcpUrl = `http://127.0.0.1:${ciPort}/mcp`;

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
    DISCHARGE_GATEKEEPER_MCP_URL: dgMcpUrl,
    CLINICAL_INTELLIGENCE_MCP_URL: ciMcpUrl,
    DEFAULT_STRUCTURED_SCENARIO_ID: "third_synthetic_discharge_slice_ready_v1",
  });

  try {
    await waitForReady(`http://127.0.0.1:${dgPort}/readyz`, 20000);
    await waitForReady(`http://127.0.0.1:${ciPort}/readyz`, 20000);
    await waitForReady(`http://127.0.0.1:${a2aPort}/readyz`, 20000);

    const prompts = [
      TRAP_PATIENT_TASK_INPUT.prompt,
      "What hidden risk changed that answer? Show me the contradiction and the evidence.",
      "What exactly must happen before discharge, and prepare the transition package.",
    ];

    const rehearsals = [] as Array<{
      run: number;
      totalElapsedMs: number;
      promptResults: Array<{
        prompt: string;
        elapsedMs: number;
        finalVerdict: string;
        hiddenRiskRunStatus: string;
        decisionMatrixRow: number;
        contradictionSummary: string;
        hiddenRiskCitationCount: number;
      }>;
    }>;
    const promptArtifacts = [] as Array<{
      run: number;
      prompts: Array<{
        prompt: string;
        elapsedMs: number;
        task: any;
      }>;
    }>;

    for (let runIndex = 1; runIndex <= 2; runIndex += 1) {
      const runStart = Date.now();
      const promptResults = [] as Array<{
        prompt: string;
        elapsedMs: number;
        finalVerdict: string;
        hiddenRiskRunStatus: string;
        decisionMatrixRow: number;
        contradictionSummary: string;
        hiddenRiskCitationCount: number;
      }>;
      const promptTasks = [] as Array<{
        prompt: string;
        elapsedMs: number;
        task: any;
      }>;

      for (const prompt of prompts) {
        const taskStart = Date.now();
        const task = await createTask(a2aBaseUrl, {
          ...TRAP_PATIENT_TASK_INPUT,
          prompt,
        });
        const elapsedMs = Date.now() - taskStart;
        promptTasks.push({
          prompt,
          elapsedMs,
          task,
        });
        promptResults.push({
          prompt,
          elapsedMs,
          finalVerdict: task.output.final_verdict,
          hiddenRiskRunStatus: task.output.hidden_risk_run_status,
          decisionMatrixRow: task.output.decision_matrix_row,
          contradictionSummary: String(task.output.contradiction_summary),
          hiddenRiskCitationCount: task.output.citations.hidden_risk.length,
        });
        assert.equal(typeof task.request_id, "string");
        assert.equal(task.output.runtime_diagnostics?.request_id, task.request_id);
      }

      rehearsals.push({
        run: runIndex,
        totalElapsedMs: Date.now() - runStart,
        promptResults,
      });
      promptArtifacts.push({
        run: runIndex,
        prompts: promptTasks,
      });
    }

    assert.equal(rehearsals.length, 2);
    for (const rehearsal of rehearsals) {
      assert.equal(rehearsal.promptResults[0].finalVerdict, "not_ready");
      assert.equal(rehearsal.promptResults[0].hiddenRiskRunStatus, "used");
      assert.equal(rehearsal.promptResults[0].decisionMatrixRow, 3);
      assert.equal(rehearsal.promptResults[1].finalVerdict, "not_ready");
      assert.equal(
        rehearsal.promptResults[1].contradictionSummary.includes("Nursing Note 2026-04-18 20:40"),
        true,
      );
      assert.equal(
        rehearsal.promptResults[1].contradictionSummary.includes("Case Management Addendum 2026-04-18 20:55"),
        true,
      );
      assert.equal(
        rehearsal.promptResults[2].contradictionSummary.includes("Before discharge, complete:"),
        true,
      );
    }

    const deterministic = parseToolPayload(
      await withMcpClient(dgMcpUrl, async (client) =>
        client.callTool({
          name: "assess_discharge_readiness",
          arguments: {
            scenario_id: "third_synthetic_discharge_slice_ready_v1",
          },
        }),
      ),
    );
    assert.equal(deterministic.verdict, "ready");

    const trapDirectHiddenRisk = parseToolPayload(
      await withMcpClient(ciMcpUrl, async (client) =>
        client.callTool({
          name: "surface_hidden_risks",
          arguments: {
            deterministic_snapshot: buildDeterministicSnapshot(deterministic),
            narrative_evidence_bundle:
              TRAP_PATIENT_TASK_INPUT.patient_context?.narrative_evidence_bundle || [],
            optional_context_metadata:
              TRAP_PATIENT_TASK_INPUT.patient_context?.optional_context_metadata,
          },
        }),
      ),
    );
    assert.equal(trapDirectHiddenRisk.status, "ok");
    assert.equal(trapDirectHiddenRisk.hidden_risk_summary.result, "hidden_risk_present");
    assert.equal(trapDirectHiddenRisk.hidden_risk_summary.overall_disposition_impact, "not_ready");

    const directFallbackPrompt3 = parseToolPayload(
      await withMcpClient(ciMcpUrl, async (client) =>
        client.callTool({
          name: "synthesize_transition_narrative",
          arguments: {
            deterministic_snapshot: buildDeterministicSnapshot(deterministic),
            narrative_evidence_bundle:
              TRAP_PATIENT_TASK_INPUT.patient_context?.narrative_evidence_bundle || [],
            optional_context_metadata: {
              ...TRAP_PATIENT_TASK_INPUT.patient_context?.optional_context_metadata,
              explicit_task_goal: "Prepare the transition package for direct-MCP fallback validation.",
            },
          },
        }),
      ),
    );
    assert.equal(directFallbackPrompt3.status, "ok");
    assert.equal(directFallbackPrompt3.proposed_disposition, "not_ready");
    assert.equal(directFallbackPrompt3.recommended_actions.length > 0, true);

    const controlFallback = parseToolPayload(
      await withMcpClient(ciMcpUrl, async (client) =>
        client.callTool({
          name: "surface_hidden_risks",
          arguments: {
            deterministic_snapshot: {
              patient_id: CONTROL_TASK_INPUT.patient_context?.patient_id || null,
              encounter_id: CONTROL_TASK_INPUT.patient_context?.encounter_id || null,
              baseline_verdict: "ready",
              deterministic_blockers: [],
              deterministic_evidence: [
                {
                  source_label: "Structured resting snapshot",
                  detail:
                    "Vitals stable on room air at rest and all discharge checklist fields complete.",
                },
              ],
              deterministic_next_steps: [],
              deterministic_summary: "Structured discharge snapshot remains ready.",
            },
            narrative_evidence_bundle:
              CONTROL_TASK_INPUT.patient_context?.narrative_evidence_bundle || [],
            optional_context_metadata: CONTROL_TASK_INPUT.patient_context?.optional_context_metadata,
          },
        }),
      ),
    );
    assert.equal(controlFallback.status, "ok");
    assert.equal(controlFallback.hidden_risk_summary.result, "no_hidden_risk");

    const report = {
      generated_at: new Date().toISOString(),
      run_id: runId,
      a2a_rehearsals: rehearsals,
      direct_mcp_fallback: {
        deterministic_verdict: deterministic.verdict,
        hidden_risk_status: trapDirectHiddenRisk.status,
        hidden_risk_result: trapDirectHiddenRisk.hidden_risk_summary.result,
        hidden_risk_impact: trapDirectHiddenRisk.hidden_risk_summary.overall_disposition_impact,
        transition_package_status: directFallbackPrompt3.status,
        transition_package_disposition: directFallbackPrompt3.proposed_disposition,
        transition_package_action_count: directFallbackPrompt3.recommended_actions.length,
        control_hidden_risk_result: controlFallback.hidden_risk_summary.result,
      },
    };

    writeJson(path.join(runReportsDir, "prompt-opinion-rehearsal-report.json"), report);
    writeJson(path.join(outputDir, "prompt-opinion-rehearsal-report.json"), report);

    for (const artifact of promptArtifacts) {
      for (let promptIndex = 0; promptIndex < artifact.prompts.length; promptIndex += 1) {
        const promptArtifact = artifact.prompts[promptIndex];
        writeJson(
          path.join(runRawDir, `a2a-run${artifact.run}-prompt${promptIndex + 1}.json`),
          promptArtifact.task,
        );
      }
    }

    writeJson(path.join(runRawDir, "fallback-prompt1-deterministic.json"), deterministic);
    writeJson(path.join(runRawDir, "fallback-prompt2-hidden-risk.json"), trapDirectHiddenRisk);
    writeJson(path.join(runRawDir, "fallback-prompt3-transition-package.json"), directFallbackPrompt3);
    writeJson(path.join(runRawDir, "control-hidden-risk.json"), controlFallback);

    const timedResultsMarkdown = renderTimedResultsMarkdown({
      generated_at: report.generated_at,
      run_id: report.run_id,
      a2a_rehearsals: report.a2a_rehearsals,
    });
    fs.writeFileSync(path.join(runReportsDir, "timed-rehearsal-results.md"), timedResultsMarkdown);
    fs.writeFileSync(path.join(outputDir, "timed-rehearsal-results.md"), timedResultsMarkdown);

    console.log("PASS prompt opinion rehearsal smoke");
    console.log(`Run artifacts: ${runDir}`);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    a2a.kill("SIGTERM");
    ci.kill("SIGTERM");
    dg.kill("SIGTERM");
  }
};

void run();
