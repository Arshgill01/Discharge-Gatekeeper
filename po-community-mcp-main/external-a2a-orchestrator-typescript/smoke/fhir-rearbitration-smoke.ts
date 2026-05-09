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

const createTask = async (baseUrl: string, prompt: string): Promise<any> => {
  const response = await fetch(`${baseUrl}/tasks`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      requestId: `rearbitration-${prompt.replace(/\W+/g, "-").toLowerCase()}`,
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

const main = async (): Promise<void> => {
  await seedFhirBundles({
    fhirServer: DEFAULT_LOCAL_FHIR_BASE_URL,
    storePath: DEFAULT_LOCAL_FHIR_STORE_PATH,
  });

  const root = process.cwd();
  const dgCwd = `${root}/../typescript`;
  const ciCwd = `${root}/../clinical-intelligence-typescript`;
  const dgPort = "5205";
  const ciPort = "5206";
  const a2aPort = "5207";

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
    const initial = await createTask(baseUrl, "Is this patient safe to discharge today?");
    const partial = await createTask(baseUrl, "Oxygen delivery confirmed — update discharge status.");
    const full = await createTask(
      baseUrl,
      "Oxygen delivery confirmed, exertional reassessment passed, and overnight support confirmed — update discharge status.",
    );

    const taskBundle = await searchFhirResources(
      DEFAULT_LOCAL_FHIR_BASE_URL,
      "Task",
      ["encounter=Encounter/maria-discharge-2026-0418", "_count=20"],
      { storePath: DEFAULT_LOCAL_FHIR_STORE_PATH },
    );
    const auditBundle = await searchFhirResources(
      DEFAULT_LOCAL_FHIR_BASE_URL,
      "AuditEvent",
      ["_count=20"],
      { storePath: DEFAULT_LOCAL_FHIR_STORE_PATH },
    );
    const provenanceBundle = await searchFhirResources(
      DEFAULT_LOCAL_FHIR_BASE_URL,
      "Provenance",
      ["_count=50"],
      { storePath: DEFAULT_LOCAL_FHIR_STORE_PATH },
    );
    const taskStatuses = (taskBundle.entry ?? []).map((entry) => ({
      id: (entry.resource as { id?: string })?.id ?? "",
      status: (entry.resource as { status?: string })?.status ?? "",
    }));

    assert.equal(initial.output.final_verdict, "not_ready");
    assert.equal(partial.output.final_verdict, "not_ready");
    assert.equal(full.output.final_verdict, "ready_with_caveats");

    assert.match(String(partial.output.contradiction_summary), /DISCHARGE STATUS UPDATE/);
    assert.match(String(partial.output.contradiction_summary), /Previous status: NOT_READY/);
    assert.match(String(partial.output.contradiction_summary), /Remaining unresolved gates:/);
    assert.match(String(partial.output.contradiction_summary), /AuditEvent\//);

    assert.match(String(full.output.contradiction_summary), /Updated status: READY_WITH_CAVEATS/);
    assert.match(String(full.output.contradiction_summary), /Remaining unresolved gates: none/i);
    assert.equal(taskStatuses.every((task) => task.status === "completed"), true);
    assert.equal((auditBundle.entry ?? []).length >= 3, true);
    assert.equal((provenanceBundle.entry ?? []).length >= 3, true);

    console.log("SMOKE PASS: fhir rearbitration");
    console.log(
      JSON.stringify(
        {
          initial_final_verdict: initial.output.final_verdict,
          partial_final_verdict: partial.output.final_verdict,
          full_final_verdict: full.output.final_verdict,
          task_statuses: taskStatuses,
          audit_event_count: (auditBundle.entry ?? []).length,
          provenance_count: (provenanceBundle.entry ?? []).length,
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
