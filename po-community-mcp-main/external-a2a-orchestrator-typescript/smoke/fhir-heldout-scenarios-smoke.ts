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

const createTask = async (
  baseUrl: string,
  patientId: string,
  encounterId: string,
  prompt: string,
): Promise<any> => {
  const response = await fetch(`${baseUrl}/tasks`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      requestId: `heldout-${patientId}-${prompt.replace(/\W+/g, "-").toLowerCase()}`,
      input: {
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: prompt }],
          },
        ],
        patientContext: {
          patient_id: patientId,
          encounter_id: encounterId,
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

const main = async (): Promise<void> => {
  await seedFhirBundles({
    fhirServer: DEFAULT_LOCAL_FHIR_BASE_URL,
    storePath: DEFAULT_LOCAL_FHIR_STORE_PATH,
  });

  const root = process.cwd();
  const dgCwd = `${root}/../typescript`;
  const ciCwd = `${root}/../clinical-intelligence-typescript`;
  const dgPort = "5215";
  const ciPort = "5216";
  const a2aPort = "5217";

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
    const danielPrompt1 = await createTask(baseUrl, "daniel-brooks", "daniel-discharge-2026-0419", "Is this patient safe to discharge today?");
    const danielPrompt3 = await createTask(
      baseUrl,
      "daniel-brooks",
      "daniel-discharge-2026-0419",
      "What exactly must happen before discharge, and prepare the transition package.",
    );
    const oliviaPrompt1 = await createTask(baseUrl, "olivia-chen", "olivia-discharge-2026-0419", "Is this patient safe to discharge today?");

    assert.equal(danielPrompt1.output.final_verdict, "not_ready");
    assert.match(String(danielPrompt1.output.contradiction_summary), /DocumentReference\/daniel-pharmacy-note-1815/);
    assert.match(String(danielPrompt1.output.contradiction_summary), /Task\/ctc-daniel-discharge-2026-0419-medication-reconciliation/);
    assert.equal(
      danielPrompt1.output.transition_safety_packet.fhir_resources_written.some(
        (resource: { reference: string }) => resource.reference === "Task/ctc-daniel-discharge-2026-0419-clinical-stability",
      ),
      true,
    );
    assert.equal(
      danielPrompt1.output.transition_safety_packet.fhir_resources_written.some(
        (resource: { reference: string }) => resource.reference === "Task/ctc-daniel-discharge-2026-0419-patient-education",
      ),
      true,
    );
    assert.equal(
      /maria/i.test(String(danielPrompt1.output.contradiction_summary)),
      false,
      "Daniel output must not leak Maria-specific text.",
    );

    assert.equal(danielPrompt3.output.final_verdict, "not_ready");
    assert.match(String(danielPrompt3.output.contradiction_summary), /DocumentReference\/daniel-pharmacy-note-1815/);
    assert.match(String(danielPrompt3.output.contradiction_summary), /DocumentReference\/daniel-nursing-note-1840/);

    assert.equal(oliviaPrompt1.output.final_verdict, "ready");
    assert.equal(
      oliviaPrompt1.output.transition_safety_packet.fhir_resources_written.some(
        (resource: { resource_type: string }) => resource.resource_type === "Task",
      ),
      false,
    );
    assert.match(String(oliviaPrompt1.output.contradiction_summary), /Written FHIR Tasks: none\./i);

    console.log("SMOKE PASS: fhir heldout scenarios");
    console.log(
      JSON.stringify(
        {
          daniel_prompt1_final_verdict: danielPrompt1.output.final_verdict,
          daniel_prompt3_final_verdict: danielPrompt3.output.final_verdict,
          olivia_prompt1_final_verdict: oliviaPrompt1.output.final_verdict,
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
