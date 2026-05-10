import assert from "node:assert/strict";
import { Request } from "express";
import { surfaceHiddenRisks } from "../clinical-intelligence/surface-hidden-risks";
import { resolveWorkflowInputForRequest } from "../../typescript/discharge-readiness/live-context";
import { assessDischargeReadinessV1 } from "../../typescript/discharge-readiness/assess-discharge-readiness";
import {
  DEFAULT_LOCAL_FHIR_BASE_URL,
  DEFAULT_LOCAL_FHIR_STORE_PATH,
  seedFhirBundles,
} from "../../typescript/fhir-store";

process.env["CLINICAL_INTELLIGENCE_LLM_PROVIDER"] = "heuristic";

const REMOTE_FHIR_SERVER_URL =
  process.env["PROMPT_OPINION_FHIR_SERVER_URL"]?.trim() || DEFAULT_LOCAL_FHIR_BASE_URL;
const REMOTE_FHIR_ACCESS_TOKEN =
  process.env["PROMPT_OPINION_FHIR_ACCESS_TOKEN"]?.trim() || "";
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

const makeRequest = (patientId: string, encounterId: string): Request => {
  return {
    headers: {
      "x-fhir-server-url": REMOTE_FHIR_SERVER_URL,
      ...(REMOTE_FHIR_ACCESS_TOKEN
        ? { "x-fhir-access-token": REMOTE_FHIR_ACCESS_TOKEN }
        : {}),
      "x-patient-id": patientId,
      "x-encounter-id": encounterId,
    },
  } as unknown as Request;
};

const buildHiddenRiskInput = async (patientId: string, encounterId: string) => {
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
      })),
      deterministic_next_steps: deterministic.next_steps.map((step) => step.action),
      deterministic_summary: deterministic.summary,
    },
    narrative_evidence_bundle: resolution.fhir_context?.narrative_evidence_bundle ?? [],
    optional_context_metadata: resolution.fhir_context?.optional_context_metadata,
  };
};

const main = async (): Promise<void> => {
  await seedFhirBundles({
    fhirServer: DEFAULT_LOCAL_FHIR_BASE_URL,
    storePath: DEFAULT_LOCAL_FHIR_STORE_PATH,
  });

  const maria = await surfaceHiddenRisks(
    await buildHiddenRiskInput(PATIENT_IDS.maria, "maria-discharge-2026-0418"),
    { responseMode: "full" },
  );
  const daniel = await surfaceHiddenRisks(
    await buildHiddenRiskInput(PATIENT_IDS.daniel, "daniel-discharge-2026-0419"),
    { responseMode: "full" },
  );
  const olivia = await surfaceHiddenRisks(
    await buildHiddenRiskInput(PATIENT_IDS.olivia, "olivia-discharge-2026-0419"),
    { responseMode: "full" },
  );

  assert.equal(maria.payload.hidden_risk_summary.result, "hidden_risk_present");
  assert.equal(maria.payload.hidden_risk_summary.overall_disposition_impact, "not_ready");
  assert.equal(
    maria.payload.citations.some((citation) => citation.source_label.includes("Nursing Note 2026-04-18 20:40")),
    true,
  );

  assert.equal(daniel.payload.hidden_risk_summary.result, "hidden_risk_present");
  assert.equal(
    daniel.payload.citations.some((citation) => citation.source_label.includes("Pharmacy Note 2026-04-19 18:15")),
    true,
  );

  assert.equal(olivia.payload.hidden_risk_summary.result, "no_hidden_risk");
  assert.equal(olivia.payload.hidden_risk_findings.length, 0);

  console.log("SMOKE PASS: fhir narrative ingest");
  console.log(
    JSON.stringify(
      {
        maria_result: maria.payload.hidden_risk_summary.result,
        daniel_result: daniel.payload.hidden_risk_summary.result,
        olivia_result: olivia.payload.hidden_risk_summary.result,
        maria_citation_count: maria.payload.citations.length,
        daniel_citation_count: daniel.payload.citations.length,
        using_prompt_opinion_fhir: USING_PROMPT_OPINION_FHIR,
        daniel_citation_references: daniel.payload.citations.map((citation) => citation.fhir_reference),
      },
      null,
      2,
    ),
  );
};

void main();
