import assert from "node:assert/strict";
import { spawn, ChildProcess } from "node:child_process";
import {
  DEFAULT_LOCAL_FHIR_BASE_URL,
  DEFAULT_LOCAL_FHIR_STORE_PATH,
  readFhirResource,
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
      requestId: `audit-${prompt.replace(/\W+/g, "-").toLowerCase()}`,
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
    assert.equal(auditWrites.length, 1);
    assert.match(String(prompt2.output.contradiction_summary), /AuditEvent\//i);

    const firstProvenance = await readFhirResource(
      DEFAULT_LOCAL_FHIR_BASE_URL,
      provenanceWrites[0].reference,
      { storePath: DEFAULT_LOCAL_FHIR_STORE_PATH },
    );
    const auditEvent = await readFhirResource(
      DEFAULT_LOCAL_FHIR_BASE_URL,
      auditWrites[0].reference,
      { storePath: DEFAULT_LOCAL_FHIR_STORE_PATH },
    );

    assert.ok(firstProvenance, "Expected a stored Provenance resource.");
    assert.ok(auditEvent, "Expected a stored AuditEvent resource.");
    assert.equal(Array.isArray((firstProvenance as { target?: unknown[] }).target), true);
    assert.equal(Array.isArray((auditEvent as { entity?: unknown[] }).entity), true);

    console.log("SMOKE PASS: fhir audit writeback");
    console.log(
      JSON.stringify(
        {
          task_write_count: taskWrites.length,
          provenance_write_count: provenanceWrites.length,
          audit_write_count: auditWrites.length,
          audit_reference: auditWrites[0].reference,
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
