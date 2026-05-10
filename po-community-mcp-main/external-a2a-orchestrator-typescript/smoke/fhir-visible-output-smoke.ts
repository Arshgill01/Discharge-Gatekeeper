import assert from "node:assert/strict";
import { spawn, ChildProcess } from "node:child_process";
import {
  DEFAULT_LOCAL_FHIR_BASE_URL,
  DEFAULT_LOCAL_FHIR_STORE_PATH,
  seedFhirBundles,
} from "../../typescript/fhir-store";

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

const createTask = async (baseUrl: string, prompt: string): Promise<any> => {
  const response = await fetch(`${baseUrl}/tasks`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      requestId: `fhir-${prompt.replace(/\W+/g, "-").toLowerCase()}`,
      input: {
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: prompt }],
          },
        ],
        patientContext: {
          patient_id: "maria-alvarez",
          encounter_id: "maria-discharge-2026-0418",
          fhir_context: {
            fhir_server: DEFAULT_LOCAL_FHIR_BASE_URL,
          },
        },
      },
    }),
  });
  assert.equal(response.status, 201);
  return response.json();
};

const assertVisibleFhirReferences = (text: string, context: string): void => {
  assert.match(text, /Raw FHIR references:/i, `${context}: missing raw FHIR reference line.`);
  assert.match(
    text,
    /DocumentReference\/maria-nursing-note-2040/i,
    `${context}: expected Maria nursing DocumentReference ref.`,
  );
};

const main = async (): Promise<void> => {
  await seedFhirBundles({
    fhirServer: DEFAULT_LOCAL_FHIR_BASE_URL,
    storePath: DEFAULT_LOCAL_FHIR_STORE_PATH,
  });

  const root = process.cwd();
  const dgCwd = `${root}/../typescript`;
  const ciCwd = `${root}/../clinical-intelligence-typescript`;
  const dgPort = "5175";
  const ciPort = "5176";
  const a2aPort = "5177";

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
  });

  try {
    await waitForReady(`http://127.0.0.1:${dgPort}/readyz`, 20000);
    await waitForReady(`http://127.0.0.1:${ciPort}/readyz`, 20000);
    await waitForReady(`http://127.0.0.1:${a2aPort}/readyz`, 20000);

    const baseUrl = `http://127.0.0.1:${a2aPort}`;
    const prompt1 = await createTask(baseUrl, "Is this patient safe to discharge today?");
    const prompt2 = await createTask(
      baseUrl,
      "What hidden risk changed that answer? Show me the contradiction and the evidence.",
    );
    const prompt3 = await createTask(
      baseUrl,
      "What exactly must happen before discharge, and prepare the transition package.",
    );

    assert.equal(prompt1.output.deterministic.verdict, "ready");
    assert.equal(prompt1.output.final_verdict, "not_ready");
    assertVisibleFhirReferences(String(prompt1.output.contradiction_summary), "Prompt 1");
    assertVisibleFhirReferences(String(prompt2.output.contradiction_summary), "Prompt 2");
    assertVisibleFhirReferences(String(prompt3.output.contradiction_summary), "Prompt 3");
    assert.equal(
      String(prompt3.output.contradiction_summary).includes("TRANSITION PACKAGE - DISCHARGE HOLD ACTIVE"),
      true,
    );

    console.log("SMOKE PASS: fhir visible output");
    console.log(
      JSON.stringify(
        {
          prompt1_final_verdict: prompt1.output.final_verdict,
          prompt2_hidden_risk_result: prompt2.output.hidden_risk_result,
          prompt3_final_verdict: prompt3.output.final_verdict,
        },
        null,
        2,
      ),
    );
  } finally {
    a2a.kill("SIGTERM");
    ci.kill("SIGTERM");
    dg.kill("SIGTERM");
  }
};

void main();
