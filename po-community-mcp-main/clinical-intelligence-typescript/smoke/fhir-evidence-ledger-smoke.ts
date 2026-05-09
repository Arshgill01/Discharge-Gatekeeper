import assert from "node:assert/strict";
import { Request } from "express";
import { surfaceHiddenRisks } from "../clinical-intelligence/surface-hidden-risks";
import { synthesizeTransitionNarrative } from "../clinical-intelligence/synthesize-transition-narrative";
import { formatPromptOpinionSlimHiddenRisk } from "../tools/SurfaceHiddenRisksTool";
import { formatPromptOpinionSlimTransitionPackage } from "../tools/SynthesizeTransitionNarrativeTool";
import { resolveWorkflowInputForRequest } from "../../typescript/discharge-readiness/live-context";
import { assessDischargeReadinessV1 } from "../../typescript/discharge-readiness/assess-discharge-readiness";
import {
  DEFAULT_LOCAL_FHIR_BASE_URL,
  DEFAULT_LOCAL_FHIR_STORE_PATH,
  seedFhirBundles,
} from "../../typescript/fhir-store";

process.env["CLINICAL_INTELLIGENCE_LLM_PROVIDER"] = "heuristic";

const makeRequest = (patientId: string, encounterId: string): Request => {
  return {
    headers: {
      "x-fhir-server-url": DEFAULT_LOCAL_FHIR_BASE_URL,
      "x-patient-id": patientId,
      "x-encounter-id": encounterId,
    },
  } as unknown as Request;
};

const buildInput = async (patientId: string, encounterId: string) => {
  const resolution = await resolveWorkflowInputForRequest(makeRequest(patientId, encounterId), {
    allowSyntheticFallback: false,
    contextMode: "fhir_native",
  });
  const deterministic = assessDischargeReadinessV1(resolution.input);

  return {
    deterministic_snapshot: {
      patient_id: patientId,
      encounter_id: encounterId,
      baseline_verdict: deterministic.verdict,
      deterministic_blockers: deterministic.blockers.map((blocker) => ({
        blocker_id: blocker.id,
        category: blocker.category,
        description: blocker.description,
        severity: blocker.priority,
      })),
      deterministic_evidence: deterministic.evidence.map((evidence) => ({
        evidence_id: evidence.id,
        source_label: evidence.source_label,
        detail: evidence.detail,
        fhir_reference: evidence.fhir_reference,
        fhir_resource_type: evidence.fhir_resource_type,
        fhir_resource_id: evidence.fhir_resource_id,
        fhir_timestamp: evidence.fhir_timestamp,
      })),
      deterministic_next_steps: deterministic.next_steps.map((step) => step.action),
      deterministic_summary: deterministic.summary,
    },
    narrative_evidence_bundle: resolution.fhir_context?.narrative_evidence_bundle ?? [],
    optional_context_metadata: resolution.fhir_context?.optional_context_metadata,
    fhir_context: resolution.fhir_context,
  };
};

const main = async (): Promise<void> => {
  await seedFhirBundles({
    fhirServer: DEFAULT_LOCAL_FHIR_BASE_URL,
    storePath: DEFAULT_LOCAL_FHIR_STORE_PATH,
  });

  const mariaInput = await buildInput("maria-alvarez", "maria-discharge-2026-0418");
  const danielInput = await buildInput("daniel-brooks", "daniel-discharge-2026-0419");
  const oliviaInput = await buildInput("olivia-chen", "olivia-discharge-2026-0419");

  const mariaHidden = await surfaceHiddenRisks(mariaInput, { responseMode: "full" });
  const danielNarrative = await synthesizeTransitionNarrative(danielInput, { responseMode: "full" });
  const oliviaNarrative = await synthesizeTransitionNarrative(oliviaInput, { responseMode: "full" });

  assert.equal(
    mariaHidden.payload.citations.some(
      (citation) => citation.fhir_reference === "DocumentReference/maria-nursing-note-2040",
    ),
    true,
  );

  assert.equal(
    danielNarrative.transition_safety_packet.fhir_server,
    DEFAULT_LOCAL_FHIR_BASE_URL,
  );
  assert.equal(
    danielNarrative.transition_safety_packet.structured_evidence.some(
      (item) => item.reference === "MedicationRequest/daniel-sacubitril-valsartan",
    ),
    true,
  );
  assert.equal(
    danielNarrative.transition_safety_packet.narrative_evidence.some(
      (item) => item.reference === "DocumentReference/daniel-pharmacy-note-1815",
    ),
    true,
  );
  assert.equal(
    danielNarrative.transition_safety_packet.controlling_evidence.some(
      (item) => item.reference === "DocumentReference/daniel-pharmacy-note-1815",
    ),
    true,
  );
  assert.equal(
    oliviaNarrative.transition_safety_packet.controlling_evidence.length,
    0,
    "Olivia clean control must not fabricate controlling hidden-risk evidence.",
  );

  const mariaSlim = formatPromptOpinionSlimHiddenRisk(mariaHidden.payload);
  const danielSlimPacket = formatPromptOpinionSlimTransitionPackage(danielNarrative);
  assert.match(mariaSlim, /DocumentReference\/maria-nursing-note-2040/);
  assert.match(danielSlimPacket, /DocumentReference\/daniel-pharmacy-note-1815/);

  console.log("SMOKE PASS: fhir evidence ledger");
  console.log(
    JSON.stringify(
      {
        daniel_structured_evidence: danielNarrative.transition_safety_packet.structured_evidence.length,
        daniel_narrative_evidence: danielNarrative.transition_safety_packet.narrative_evidence.length,
        daniel_controlling_evidence: danielNarrative.transition_safety_packet.controlling_evidence.length,
        olivia_controlling_evidence: oliviaNarrative.transition_safety_packet.controlling_evidence.length,
      },
      null,
      2,
    ),
  );
};

void main();
