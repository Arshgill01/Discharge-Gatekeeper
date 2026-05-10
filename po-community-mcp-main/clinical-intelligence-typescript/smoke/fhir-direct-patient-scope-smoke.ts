import assert from "node:assert/strict";
import { Request } from "express";
import {
  DEFAULT_LOCAL_FHIR_BASE_URL,
  DEFAULT_LOCAL_FHIR_STORE_PATH,
  searchFhirResources,
  seedFhirBundles,
} from "../../typescript/fhir-store";
import { buildFhirDirectPatientScopeResult } from "../tools/fhirDirectPatientScope";

const makeRequest = (patientId: string, encounterId: string): Request => {
  return {
    headers: {
      "x-fhir-server-url": DEFAULT_LOCAL_FHIR_BASE_URL,
      "x-patient-id": patientId,
      "x-encounter-id": encounterId,
    },
  } as unknown as Request;
};

const readEncounterTasks = async (encounterId: string) => {
  const bundle = await searchFhirResources(DEFAULT_LOCAL_FHIR_BASE_URL, "Task", [
    `encounter=Encounter/${encounterId}`,
    "_count=50",
  ]);
  return (bundle.entry ?? [])
    .map((entry) => entry.resource)
    .filter(
      (resource): resource is Record<string, unknown> =>
        Boolean(resource) && resource?.["resourceType"] === "Task",
    );
};

const main = async (): Promise<void> => {
  process.env["CLINICAL_INTELLIGENCE_LLM_PROVIDER"] = "heuristic";

  await seedFhirBundles({
    fhirServer: DEFAULT_LOCAL_FHIR_BASE_URL,
    storePath: DEFAULT_LOCAL_FHIR_STORE_PATH,
  });

  const danielRequest = makeRequest(
    "db4b066b-200f-405f-9fe4-c52eefbc1425",
    "daniel-discharge-2026-0419",
  );
  const oliviaRequest = makeRequest(
    "be404f97-dfa6-4875-b715-0ec8599b7d22",
    "olivia-discharge-2026-0419",
  );

  const danielPrompt1 = await buildFhirDirectPatientScopeResult(danielRequest, {
    prompt: "Is this patient safe to discharge today?",
    explicitTaskGoal: "Daniel direct Prompt 1 smoke",
  });
  assert.ok(danielPrompt1, "Daniel Prompt 1 should resolve live FHIR context.");
  assert.equal(danielPrompt1.reconciled.final_verdict, "not_ready");
  assert.match(danielPrompt1.narrative, /DocumentReference\/daniel-pharmacy-note-1815/);
  assert.match(danielPrompt1.narrative, /Observation\/daniel-weight-evening|DocumentReference\/daniel-nursing-note-1840/);
  assert.match(danielPrompt1.narrative, /Task\/ctc-daniel-discharge-2026-0419-medication-reconciliation/);
  assert.equal(/maria/i.test(danielPrompt1.narrative), false);
  assert.equal(/machine_summary/i.test(danielPrompt1.narrative), false);

  const danielPrompt2 = await buildFhirDirectPatientScopeResult(danielRequest, {
    prompt: "What hidden risk changed that answer? Show me the contradiction and the evidence.",
    explicitTaskGoal: "Daniel direct Prompt 2 smoke",
  });
  assert.ok(danielPrompt2, "Daniel Prompt 2 should resolve live FHIR context.");
  assert.match(danielPrompt2.narrative, /HIDDEN CONTRADICTION REVIEW/i);
  assert.match(danielPrompt2.narrative, /DocumentReference\/daniel-pharmacy-note-1815/);
  assert.match(danielPrompt2.narrative, /DocumentReference\/daniel-nursing-note-1840/);
  assert.equal(/maria/i.test(danielPrompt2.narrative), false);

  const danielPrompt3 = await buildFhirDirectPatientScopeResult(danielRequest, {
    prompt: "What exactly must happen before discharge, and prepare the transition package.",
    explicitTaskGoal: "Daniel direct Prompt 3 smoke",
  });
  assert.ok(danielPrompt3, "Daniel Prompt 3 should resolve live FHIR context.");
  assert.match(danielPrompt3.narrative, /TRANSITION PACKAGE/i);
  assert.match(danielPrompt3.narrative, /Task\/ctc-daniel-discharge-2026-0419-medication-reconciliation/);
  assert.match(danielPrompt3.narrative, /Task\/ctc-daniel-discharge-2026-0419-patient-education/);
  assert.match(danielPrompt3.narrative, /AuditEvent\/ctc-audit-/);
  assert.match(danielPrompt3.narrative, /Provenance\/ctc-provenance-/);

  const danielPrompt4 = await buildFhirDirectPatientScopeResult(danielRequest, {
    prompt:
      "New updates arrived: the medication bridge was delivered to bedside and the daughter arranged a working home scale, but the patient still reports orthopnea when lying flat. Re-arbitrate the discharge gates from the FHIR Tasks and evidence.",
    explicitTaskGoal: "Daniel direct Prompt 4 smoke",
  });
  assert.ok(danielPrompt4, "Daniel Prompt 4 should resolve live FHIR context.");
  assert.match(danielPrompt4.narrative, /DISCHARGE STATUS UPDATE/i);
  assert.match(danielPrompt4.narrative, /Previous status: NOT_READY/i);
  assert.match(danielPrompt4.narrative, /Resolved gates: .*medication_reconciliation/i);
  assert.match(danielPrompt4.narrative, /Resolved gates: .*patient_education/i);
  assert.match(danielPrompt4.narrative, /Remaining unresolved gates: clinical_stability/i);
  assert.ok(
    danielPrompt4.reconciled.final_verdict === "not_ready" ||
      danielPrompt4.reconciled.final_verdict === "ready_with_caveats",
  );

  const danielTasks = await readEncounterTasks("daniel-discharge-2026-0419");
  const taskStatusById = new Map(
    danielTasks.map((task) => [
      String(task["id"]),
      String(task["status"] ?? "unknown"),
    ]),
  );
  assert.equal(
    taskStatusById.get("ctc-daniel-discharge-2026-0419-medication-reconciliation"),
    "completed",
  );
  assert.equal(
    taskStatusById.get("ctc-daniel-discharge-2026-0419-patient-education"),
    "completed",
  );
  assert.equal(
    taskStatusById.get("ctc-daniel-discharge-2026-0419-clinical-stability"),
    "requested",
  );

  const oliviaPrompt1 = await buildFhirDirectPatientScopeResult(oliviaRequest, {
    prompt: "Is this patient safe to discharge today?",
    explicitTaskGoal: "Olivia direct Prompt 1 smoke",
  });
  assert.ok(oliviaPrompt1, "Olivia Prompt 1 should resolve live FHIR context.");
  assert.equal(oliviaPrompt1.reconciled.final_verdict, "ready");
  assert.equal(
    oliviaPrompt1.reconciled.transition_safety_packet.fhir_resources_written.some(
      (resource) => resource.resource_type === "Task",
    ),
    false,
  );
  assert.match(oliviaPrompt1.narrative, /Written FHIR Tasks: none\./i);
  assert.equal(/daniel|maria/i.test(oliviaPrompt1.narrative), false);

  console.log("SMOKE PASS: fhir direct patient scope");
  console.log(
    JSON.stringify(
      {
        daniel_prompt1_final_verdict: danielPrompt1.reconciled.final_verdict,
        daniel_prompt4_final_verdict: danielPrompt4.reconciled.final_verdict,
        daniel_task_statuses: Object.fromEntries(taskStatusById),
        olivia_prompt1_final_verdict: oliviaPrompt1.reconciled.final_verdict,
      },
      null,
      2,
    ),
  );
};

void main();
