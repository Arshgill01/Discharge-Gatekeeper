import assert from "node:assert/strict";
import { Request } from "express";
import { assessDischargeReadinessV1 } from "../discharge-readiness/assess-discharge-readiness";
import { resolveWorkflowInputForRequest } from "../discharge-readiness/live-context";
import {
  DEFAULT_LOCAL_FHIR_BASE_URL,
  DEFAULT_LOCAL_FHIR_STORE_PATH,
  seedFhirBundles,
} from "../fhir-store";

const makeRequest = (patientId: string, encounterId: string): Request => {
  return {
    headers: {
      "x-fhir-server-url": DEFAULT_LOCAL_FHIR_BASE_URL,
      "x-patient-id": patientId,
      "x-encounter-id": encounterId,
    },
  } as unknown as Request;
};

const main = async (): Promise<void> => {
  await seedFhirBundles({
    fhirServer: DEFAULT_LOCAL_FHIR_BASE_URL,
    storePath: DEFAULT_LOCAL_FHIR_STORE_PATH,
  });

  const maria = await resolveWorkflowInputForRequest(
    makeRequest("maria-alvarez", "maria-discharge-2026-0418"),
    {
      allowSyntheticFallback: false,
      contextMode: "fhir_native",
    },
  );
  const daniel = await resolveWorkflowInputForRequest(
    makeRequest("daniel-brooks", "daniel-discharge-2026-0419"),
    {
      allowSyntheticFallback: false,
      contextMode: "fhir_native",
    },
  );
  const olivia = await resolveWorkflowInputForRequest(
    makeRequest("olivia-chen", "olivia-discharge-2026-0419"),
    {
      allowSyntheticFallback: false,
      contextMode: "fhir_native",
    },
  );

  const mariaReadiness = assessDischargeReadinessV1(maria.input);
  const danielReadiness = assessDischargeReadinessV1(daniel.input);
  const oliviaReadiness = assessDischargeReadinessV1(olivia.input);

  assert.equal(maria.source, "live_fhir");
  assert.equal(daniel.source, "live_fhir");
  assert.equal(olivia.source, "live_fhir");
  assert.equal(maria.fhir_context?.fhir_server, DEFAULT_LOCAL_FHIR_BASE_URL);
  assert.equal(
    maria.fhir_context?.fhir_resources_read.some((resource) => resource.reference === "Patient/maria-alvarez"),
    true,
  );
  assert.equal(
    maria.fhir_context?.narrative_evidence_bundle.some(
      (source) => source.fhir_reference === "DocumentReference/maria-nursing-note-2040",
    ),
    true,
  );
  assert.equal(mariaReadiness.verdict, "ready");
  assert.equal(danielReadiness.verdict, "ready");
  assert.equal(oliviaReadiness.verdict, "ready");
  assert.equal(
    olivia.fhir_context?.narrative_evidence_bundle.length,
    2,
    "Expected Olivia control to still expose narrative documents even though they are reassuring.",
  );

  console.log("SMOKE PASS: fhir native ingest");
  console.log(
    JSON.stringify(
      {
        maria_verdict: mariaReadiness.verdict,
        daniel_verdict: danielReadiness.verdict,
        olivia_verdict: oliviaReadiness.verdict,
        maria_resources_read: maria.fhir_context?.fhir_resources_read.length ?? 0,
        daniel_narrative_sources: daniel.fhir_context?.narrative_evidence_bundle.length ?? 0,
        olivia_narrative_sources: olivia.fhir_context?.narrative_evidence_bundle.length ?? 0,
      },
      null,
      2,
    ),
  );
};

void main();
