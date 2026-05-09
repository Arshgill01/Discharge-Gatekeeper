import assert from "node:assert/strict";
import { spawn, ChildProcess } from "node:child_process";
import {
  DEFAULT_LOCAL_FHIR_BASE_URL,
  DEFAULT_LOCAL_FHIR_STORE_PATH,
  searchFhirResources,
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
      requestId: `task-${patientId}-${prompt.replace(/\W+/g, "-").toLowerCase()}`,
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
  const dgPort = "5185";
  const ciPort = "5186";
  const a2aPort = "5187";

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
    const maria = await createTask(baseUrl, "maria-alvarez", "maria-discharge-2026-0418", "Is this patient safe to discharge today?");
    const daniel = await createTask(baseUrl, "daniel-brooks", "daniel-discharge-2026-0419", "Is this patient safe to discharge today?");
    const olivia = await createTask(baseUrl, "olivia-chen", "olivia-discharge-2026-0419", "Is this patient safe to discharge today?");

    const mariaTasks = await searchFhirResources(DEFAULT_LOCAL_FHIR_BASE_URL, "Task", [
      "encounter=Encounter/maria-discharge-2026-0418",
      "_count=20",
    ], {
      storePath: DEFAULT_LOCAL_FHIR_STORE_PATH,
    });
    const danielTasks = await searchFhirResources(DEFAULT_LOCAL_FHIR_BASE_URL, "Task", [
      "encounter=Encounter/daniel-discharge-2026-0419",
      "_count=20",
    ], {
      storePath: DEFAULT_LOCAL_FHIR_STORE_PATH,
    });
    const oliviaTasks = await searchFhirResources(DEFAULT_LOCAL_FHIR_BASE_URL, "Task", [
      "encounter=Encounter/olivia-discharge-2026-0419",
      "_count=20",
    ], {
      storePath: DEFAULT_LOCAL_FHIR_STORE_PATH,
    });

    const mariaTaskRefs: string[] = (mariaTasks.entry ?? []).map((entry) => {
      const resource = entry.resource as { id?: string } | undefined;
      return resource?.id ?? "";
    });
    const danielTaskRefs: string[] = (danielTasks.entry ?? []).map((entry) => {
      const resource = entry.resource as { id?: string } | undefined;
      return resource?.id ?? "";
    });

    assert.equal(maria.output.final_verdict, "not_ready");
    assert.equal(
      maria.output.transition_safety_packet.fhir_resources_written.some(
        (resource: { reference: string }) => resource.reference === "Task/ctc-maria-discharge-2026-0418-clinical-stability",
      ),
      true,
    );
    assert.equal(
      mariaTaskRefs.includes("ctc-maria-discharge-2026-0418-clinical-stability"),
      true,
    );
    assert.equal(
      mariaTaskRefs.includes("ctc-maria-discharge-2026-0418-equipment-and-transport"),
      true,
    );
    assert.equal(
      mariaTaskRefs.includes("ctc-maria-discharge-2026-0418-home-support-and-services"),
      true,
    );

    assert.equal(daniel.output.transition_safety_packet.fhir_resources_written.length > 0, true);
    assert.equal(danielTaskRefs.some((reference) => reference.includes("medication-reconciliation")), true);

    assert.equal(olivia.output.final_verdict, "ready");
    assert.equal((oliviaTasks.entry ?? []).length, 0);

    console.log("SMOKE PASS: fhir task writeback");
    console.log(
      JSON.stringify(
        {
          maria_task_count: (mariaTasks.entry ?? []).length,
          daniel_task_count: (danielTasks.entry ?? []).length,
          olivia_task_count: (oliviaTasks.entry ?? []).length,
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
