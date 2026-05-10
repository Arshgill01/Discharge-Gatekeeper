import assert from "node:assert/strict";
import { spawn, ChildProcess } from "node:child_process";
import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  DEFAULT_LOCAL_FHIR_BASE_URL,
  DEFAULT_LOCAL_FHIR_STORE_PATH,
  searchFhirResources,
  seedFhirBundles,
} from "../../typescript/fhir-store";

const REMOTE_FHIR_SERVER_URL =
  process.env["PROMPT_OPINION_FHIR_SERVER_URL"]?.trim() || DEFAULT_LOCAL_FHIR_BASE_URL;
const REMOTE_FHIR_ACCESS_TOKEN =
  process.env["PROMPT_OPINION_FHIR_ACCESS_TOKEN"]?.trim() || undefined;
const USING_PROMPT_OPINION_FHIR = REMOTE_FHIR_SERVER_URL !== DEFAULT_LOCAL_FHIR_BASE_URL;
const PATIENT_IDS = USING_PROMPT_OPINION_FHIR
  ? {
      maria: "179930bf-2ad5-441b-8762-ec700b82e2ca",
      daniel: "db4b066b-200f-405f-9fe4-c52eefbc1425",
      olivia: "be404f97-dfa6-4875-b715-0ec8599b7d22",
    }
  : {
      maria: "maria-alvarez",
      daniel: "daniel-brooks",
      olivia: "olivia-chen",
    };

const COOKIE_AUTH_FHIR_REQUEST_SCRIPT = path.resolve(
  __dirname,
  "..",
  "..",
  "scripts",
  "po-cookie-auth-fhir-request.mjs",
);

const queryViaPromptOpinionBrowserAuth = (pathSuffix: string) => {
  const workspaceFhirUrl = process.env["PO_WORKSPACE_FHIR_URL"]?.trim();
  if (!workspaceFhirUrl) {
    throw new Error("PO_WORKSPACE_FHIR_URL is required for browser-auth Task verification.");
  }

  const child = spawnSync(
    "npx",
    ["--yes", "--package", "playwright", "node", COOKIE_AUTH_FHIR_REQUEST_SCRIPT],
    {
      env: {
        ...process.env,
        PO_WORKSPACE_FHIR_URL: workspaceFhirUrl,
        PO_FHIR_OPERATIONS_JSON: JSON.stringify([
          {
            method: "GET",
            url: `${workspaceFhirUrl}/${pathSuffix}`,
          },
        ]),
      },
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  if (child.status !== 0) {
    throw new Error(child.stderr || child.stdout || "browser-auth GET helper failed");
  }

  const [result] = JSON.parse(child.stdout || "[]") as Array<{ ok: boolean; text: string; status: number }>;
  if (!result?.ok) {
    throw new Error(`browser-auth GET ${pathSuffix} failed with status ${result?.status}: ${result?.text}`);
  }

  return JSON.parse(result.text);
};

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
            fhir_server: REMOTE_FHIR_SERVER_URL,
            ...(REMOTE_FHIR_ACCESS_TOKEN
              ? { access_token: REMOTE_FHIR_ACCESS_TOKEN }
              : {}),
          },
        },
      },
    }),
  });
  assert.ok(response.status === 200 || response.status === 201);
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
    const maria = await createTask(baseUrl, PATIENT_IDS.maria, "maria-discharge-2026-0418", "Is this patient safe to discharge today?");
    const daniel = await createTask(baseUrl, PATIENT_IDS.daniel, "daniel-discharge-2026-0419", "Is this patient safe to discharge today?");
    const olivia = await createTask(baseUrl, PATIENT_IDS.olivia, "olivia-discharge-2026-0419", "Is this patient safe to discharge today?");

    const mariaTasks = process.env["PO_WORKSPACE_FHIR_URL"]?.trim()
      ? queryViaPromptOpinionBrowserAuth(`Task?patient=${PATIENT_IDS.maria}&_count=20`)
      : await searchFhirResources(REMOTE_FHIR_SERVER_URL, "Task", [
          `patient=${PATIENT_IDS.maria}`,
          "_count=20",
        ], {
          storePath: DEFAULT_LOCAL_FHIR_STORE_PATH,
          accessToken: REMOTE_FHIR_ACCESS_TOKEN,
        });
    const danielTasks = process.env["PO_WORKSPACE_FHIR_URL"]?.trim()
      ? queryViaPromptOpinionBrowserAuth(`Task?patient=${PATIENT_IDS.daniel}&_count=20`)
      : await searchFhirResources(REMOTE_FHIR_SERVER_URL, "Task", [
          `patient=${PATIENT_IDS.daniel}`,
          "_count=20",
        ], {
          storePath: DEFAULT_LOCAL_FHIR_STORE_PATH,
          accessToken: REMOTE_FHIR_ACCESS_TOKEN,
        });
    const oliviaTasks = process.env["PO_WORKSPACE_FHIR_URL"]?.trim()
      ? queryViaPromptOpinionBrowserAuth(`Task?patient=${PATIENT_IDS.olivia}&_count=20`)
      : await searchFhirResources(REMOTE_FHIR_SERVER_URL, "Task", [
          `patient=${PATIENT_IDS.olivia}`,
          "_count=20",
        ], {
          storePath: DEFAULT_LOCAL_FHIR_STORE_PATH,
          accessToken: REMOTE_FHIR_ACCESS_TOKEN,
        });

    const mariaTaskRefs: string[] = (mariaTasks.entry ?? []).map((entry: { resource?: { id?: string } }) => {
      const resource = entry.resource as { id?: string } | undefined;
      return resource?.id ?? "";
    });
    const danielTaskRefs: string[] = (danielTasks.entry ?? []).map((entry: { resource?: { id?: string } }) => {
      const resource = entry.resource as { id?: string } | undefined;
      return resource?.id ?? "";
    });

    assert.equal(maria.output.final_verdict, "not_ready");
    assert.equal(
      maria.output.transition_safety_packet.safety_invariants.no_task_without_fhir_source,
      "pass",
    );
    if (USING_PROMPT_OPINION_FHIR) {
      assert.equal(
        maria.output.transition_safety_packet.fhir_resources_written
          .filter((resource: { resource_type: string }) => resource.resource_type === "Task")
          .every((resource: { resource_id: string }) => !resource.resource_id.startsWith("ctc-")),
        true,
      );
      assert.equal(mariaTaskRefs.length >= 3, true);
    } else {
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
    }

    assert.equal(daniel.output.transition_safety_packet.fhir_resources_written.length > 0, true);
    assert.equal(
      daniel.output.transition_safety_packet.safety_invariants.no_task_without_fhir_source,
      "pass",
    );
    if (USING_PROMPT_OPINION_FHIR) {
      const danielTaskWrites = daniel.output.transition_safety_packet.fhir_resources_written.filter(
        (resource: { resource_type: string }) => resource.resource_type === "Task",
      );
      assert.equal(danielTaskWrites.every((resource: { resource_id: string }) => !resource.resource_id.startsWith("ctc-")), true);
      assert.equal(danielTaskRefs.length >= 3, true);
    } else {
      assert.equal(danielTaskRefs.some((reference) => reference.includes("medication-reconciliation")), true);
      assert.equal(danielTaskRefs.some((reference) => reference.includes("clinical-stability")), true);
      assert.equal(danielTaskRefs.some((reference) => reference.includes("patient-education")), true);
    }

    assert.equal(olivia.output.final_verdict, "ready");
    assert.equal(
      olivia.output.transition_safety_packet.safety_invariants.no_task_without_fhir_source,
      "pass",
    );
    assert.equal((oliviaTasks.entry ?? []).length, 0);

    console.log("SMOKE PASS: fhir task writeback");
    console.log(
      JSON.stringify(
        {
          maria_task_count: (mariaTasks.entry ?? []).length,
          daniel_task_count: (danielTasks.entry ?? []).length,
          olivia_task_count: (oliviaTasks.entry ?? []).length,
          using_prompt_opinion_fhir: USING_PROMPT_OPINION_FHIR,
          daniel_task_refs: daniel.output.transition_safety_packet.fhir_resources_written
            .filter((resource: { resource_type: string }) => resource.resource_type === "Task")
            .map((resource: { reference: string }) => resource.reference),
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
