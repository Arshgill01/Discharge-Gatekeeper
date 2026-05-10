import assert from "node:assert/strict";
import { spawn, ChildProcess } from "node:child_process";
import {
  DEFAULT_LOCAL_FHIR_BASE_URL,
  DEFAULT_LOCAL_FHIR_STORE_PATH,
  readFhirResource,
  seedFhirBundles,
} from "../../typescript/fhir-store";
import { readBundleViaPromptOpinionBrowserAuth } from "../fhir/po-cookie-auth";

const REMOTE_FHIR_SERVER_URL =
  process.env["PROMPT_OPINION_FHIR_SERVER_URL"]?.trim() || DEFAULT_LOCAL_FHIR_BASE_URL;
const REMOTE_FHIR_ACCESS_TOKEN =
  process.env["PROMPT_OPINION_FHIR_ACCESS_TOKEN"]?.trim() || undefined;
const USING_PROMPT_OPINION_FHIR = REMOTE_FHIR_SERVER_URL !== DEFAULT_LOCAL_FHIR_BASE_URL;
const PATIENT_ID = USING_PROMPT_OPINION_FHIR
  ? "db4b066b-200f-405f-9fe4-c52eefbc1425"
  : "maria-alvarez";

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
      requestId: `audit-${prompt.replace(/\W+/g, "-").toLowerCase()}`,
      input: {
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: prompt }],
          },
        ],
        patientContext: {
          patient_id: PATIENT_ID,
          encounter_id: "maria-discharge-2026-0418",
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
  const dgPort = "5195";
  const ciPort = "5196";
  const a2aPort = "5197";

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

    const prompt2 = await createTask(
      `http://127.0.0.1:${a2aPort}`,
      "What hidden risk changed that answer? Show me the contradiction and the evidence.",
    );

    const taskWrites = prompt2.output.transition_safety_packet.fhir_resources_written.filter(
      (resource: { resource_type: string }) => resource.resource_type === "Task",
    );
    const provenanceWrites = prompt2.output.transition_safety_packet.fhir_resources_written.filter(
      (resource: { resource_type: string }) => resource.resource_type === "Provenance",
    );
    const auditWrites = prompt2.output.transition_safety_packet.fhir_resources_written.filter(
      (resource: { resource_type: string }) => resource.resource_type === "AuditEvent",
    );

    assert.equal(taskWrites.length >= 3, true);
    assert.equal(provenanceWrites.length >= taskWrites.length, true);
    if (!USING_PROMPT_OPINION_FHIR) {
      assert.equal(auditWrites.length, 1);
      assert.match(String(prompt2.output.contradiction_summary), /AuditEvent\//i);
    } else {
      assert.equal(auditWrites.length, 0);
    }

    const firstProvenance = USING_PROMPT_OPINION_FHIR && process.env["PO_WORKSPACE_FHIR_URL"]?.trim()
      ? (() => {
          const bundle = readBundleViaPromptOpinionBrowserAuth("Provenance?_count=50");
          const entries = Array.isArray(bundle["entry"]) ? bundle["entry"] as Array<{ resource?: { id?: string } }> : [];
          return entries.find((entry) => entry.resource?.id === provenanceWrites[0].resource_id)?.resource ?? null;
        })()
      : await readFhirResource(
          DEFAULT_LOCAL_FHIR_BASE_URL,
          provenanceWrites[0].reference,
          { storePath: DEFAULT_LOCAL_FHIR_STORE_PATH },
        );
    const auditEvent = USING_PROMPT_OPINION_FHIR
      ? null
      : await readFhirResource(
          DEFAULT_LOCAL_FHIR_BASE_URL,
          auditWrites[0].reference,
          { storePath: DEFAULT_LOCAL_FHIR_STORE_PATH },
        );

    assert.ok(firstProvenance, "Expected a stored Provenance resource.");
    assert.equal(Array.isArray((firstProvenance as { target?: unknown[] }).target), true);
    if (!USING_PROMPT_OPINION_FHIR) {
      assert.ok(auditEvent, "Expected a stored AuditEvent resource.");
      assert.equal(Array.isArray((auditEvent as { entity?: unknown[] }).entity), true);
    }

    console.log("SMOKE PASS: fhir audit writeback");
    console.log(
      JSON.stringify(
        {
          task_write_count: taskWrites.length,
          provenance_write_count: provenanceWrites.length,
          audit_write_count: auditWrites.length,
          audit_reference: auditWrites[0]?.reference ?? null,
          using_prompt_opinion_fhir: USING_PROMPT_OPINION_FHIR,
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
