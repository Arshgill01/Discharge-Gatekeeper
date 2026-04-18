import assert from "node:assert/strict";
import { Request } from "express";
import { assessDischargeReadinessV1 } from "../discharge-readiness/assess-discharge-readiness";
import { extractDischargeBlockers } from "../discharge-readiness/extract-discharge-blockers";
import { generateTransitionPlan } from "../discharge-readiness/generate-transition-plan";
import { resolveWorkflowInputForRequest } from "../discharge-readiness/live-context";
import {
  buildClinicianHandoffBriefV1,
  draftPatientDischargeInstructionsV1,
} from "../discharge-readiness/workflow-artifacts";

const makeRequest = (headers: Record<string, string>): Request => {
  return { headers } as unknown as Request;
};

const encodeText = (value: string): string => {
  return Buffer.from(value, "utf8").toString("base64");
};

const liveRequest = makeRequest({
  "x-fhir-server-url": "https://example-fhir.test/fhir",
  "x-fhir-access-token":
    "eyJhbGciOiJub25lIn0.eyJwYXRpZW50IjoibGl2ZS1zbW9rZS1wYXRpZW50LTEifQ.",
  "x-patient-id": "live-smoke-patient-1",
});

const main = async (): Promise<void> => {
  const liveResolution = await resolveWorkflowInputForRequest(liveRequest, {
    fetchContext: async (_req, patientId) => ({
      patient_id: patientId,
      patient: {
        resourceType: "Patient",
        id: patientId,
        name: [{ text: "Avery Johnson" }],
      },
      observations: [
        {
          resourceType: "Observation",
          id: "obs-hr",
          code: { text: "Heart rate" },
          valueQuantity: { value: 88 },
        },
        {
          resourceType: "Observation",
          id: "obs-rr",
          code: { text: "Respiratory rate" },
          valueQuantity: { value: 18 },
        },
        {
          resourceType: "Observation",
          id: "obs-temp",
          code: { text: "Temperature" },
          valueQuantity: { value: 36.8 },
        },
        {
          resourceType: "Observation",
          id: "obs-bp-sys",
          code: { text: "Systolic blood pressure" },
          valueQuantity: { value: 118 },
        },
        {
          resourceType: "Observation",
          id: "obs-spo2",
          code: { text: "Oxygen saturation" },
          valueQuantity: { value: 95 },
        },
        {
          resourceType: "Observation",
          id: "obs-o2-current",
          code: { text: "Oxygen flow rate" },
          valueQuantity: { value: 2 },
        },
        {
          resourceType: "Observation",
          id: "obs-o2-baseline",
          code: { text: "Baseline oxygen flow rate" },
          valueQuantity: { value: 0 },
        },
      ],
      medication_requests: [
        {
          resourceType: "MedicationRequest",
          id: "medreq-1",
          medicationCodeableConcept: { text: "Apixaban" },
          note: [
            {
              text: "Medication reconciliation incomplete. Restart timing still missing for anticoagulation.",
            },
          ],
        },
      ],
      medication_statements: [
        {
          resourceType: "MedicationStatement",
          id: "medstmt-1",
          medicationCodeableConcept: { text: "Furosemide" },
          note: [{ text: "Home medication list reviewed." }],
        },
      ],
      service_requests: [
        {
          resourceType: "ServiceRequest",
          id: "sr-followup",
          code: { text: "Pulmonology follow-up referral" },
          status: "active",
          note: [{ text: "Referral placed but appointment pending scheduling confirmation." }],
        },
        {
          resourceType: "ServiceRequest",
          id: "sr-oxygen",
          code: { text: "Home oxygen DME coordination" },
          status: "active",
          note: [{ text: "Vendor has not confirmed oxygen delivery timing." }],
        },
        {
          resourceType: "ServiceRequest",
          id: "sr-home-health",
          code: { text: "Home health nursing" },
          status: "active",
          note: [{ text: "Home health intake pending caregiver confirmation." }],
        },
      ],
      document_references: [
        {
          resourceType: "DocumentReference",
          id: "doc-med-rec",
          description: "Medication reconciliation note",
          content: [
            {
              attachment: {
                contentType: "text/plain",
                data: encodeText(
                  "Medication reconciliation incomplete. Active inpatient insulin order is still listed and restart timing is missing.",
                ),
              },
            },
          ],
        },
        {
          resourceType: "DocumentReference",
          id: "doc-education",
          description: "Nursing discharge education note",
          content: [
            {
              attachment: {
                contentType: "text/plain",
                data: encodeText(
                  "Teach-back incomplete. Patient cannot repeat warning signs or escalation instructions.",
                ),
              },
            },
          ],
        },
        {
          resourceType: "DocumentReference",
          id: "doc-home-support",
          description: "Case management note",
          content: [
            {
              attachment: {
                contentType: "text/plain",
                data: encodeText(
                  "Caregiver unconfirmed and home services are still pending before discharge.",
                ),
              },
            },
          ],
        },
        {
          resourceType: "DocumentReference",
          id: "doc-admin",
          description: "Discharge documentation note",
          content: [
            {
              attachment: {
                contentType: "text/plain",
                data: encodeText(
                  "Documentation complete. After-visit summary signed and discharge paperwork complete.",
                ),
              },
            },
          ],
        },
      ],
      issues: [],
    }),
  });

assert.equal(liveResolution.source, "live_fhir", "Expected live context path to win when FHIR context exists.");
assert.equal(liveResolution.context_status, "complete", "Expected live smoke fixture to resolve without missing-context warnings.");
assert.ok(
  liveResolution.input.note_documents && liveResolution.input.note_documents.length >= 4,
  "Expected live context ingest to normalize document references into note_documents.",
);
assert.ok(
  liveResolution.input.evidence_catalog.some((record) => record.source_type === "structured"),
  "Expected live context ingest to preserve structured evidence records.",
);
assert.ok(
  liveResolution.input.evidence_catalog.some((record) => record.source_type === "document"),
  "Expected live context ingest to preserve document-derived evidence records.",
);

const liveReadiness = assessDischargeReadinessV1(liveResolution.input);
const liveBlockers = extractDischargeBlockers(liveResolution.input);
const liveTransition = generateTransitionPlan(liveResolution.input);
const liveClinicianHandoff = buildClinicianHandoffBriefV1(liveResolution.input);
const livePatientInstructions = draftPatientDischargeInstructionsV1(liveResolution.input);

assert.equal(liveReadiness.verdict, "not_ready", "Live context smoke fixture should stay not_ready.");
for (const category of [
  "clinical_stability",
  "medication_reconciliation",
  "follow_up_and_referrals",
  "patient_education",
  "home_support_and_services",
  "equipment_and_transport",
] as const) {
  assert.ok(
    liveReadiness.blockers.some((blocker) => blocker.category === category),
    `Expected live context blocker category '${category}' to be present.`,
  );
}
assert.deepEqual(liveBlockers.blockers, liveReadiness.blockers, "Live blocker extract should stay aligned to readiness blockers.");
assert.deepEqual(liveTransition.blockers, liveReadiness.blockers, "Live transition plan should reuse readiness blockers.");
assert.equal(
  liveClinicianHandoff.unresolved_risks.length,
  liveReadiness.blockers.length,
  "Live clinician handoff should stay one-to-one with readiness blockers.",
);
assert.equal(
  livePatientInstructions.instructions.length,
  liveReadiness.blockers.length,
  "Live patient instructions should stay one-to-one with readiness blockers.",
);

  const partialResolution = await resolveWorkflowInputForRequest(liveRequest, {
    fetchContext: async (_req, patientId) => ({
      patient_id: patientId,
      patient: {
        resourceType: "Patient",
        id: patientId,
        name: [{ text: "Avery Johnson" }],
      },
      observations: [
        {
          resourceType: "Observation",
          id: "obs-temp",
          code: { text: "Temperature" },
          valueQuantity: { value: 36.9 },
        },
      ],
      medication_requests: [],
      medication_statements: [],
      service_requests: [],
      document_references: [],
      issues: [
        "MedicationRequest scope unavailable from Prompt Opinion context.",
        "DocumentReference scope unavailable from Prompt Opinion context.",
      ],
    }),
  });

assert.equal(partialResolution.source, "live_fhir", "Partial context should still stay on the live ingest path.");
assert.equal(partialResolution.context_status, "partial", "Expected partial live context to be marked partial.");
assert.ok(
  partialResolution.input.medication_reconciliation.unresolved_issues.some((issue) =>
    issue.includes("MedicationRequest") || issue.includes("MedicationStatement"),
  ),
  "Expected partial live context to create an explicit medication-context gap.",
);
assert.equal(
  partialResolution.input.patient_education.teach_back_complete,
  false,
  "Expected partial live context to mark missing education-note context as incomplete.",
);
const partialReadiness = assessDischargeReadinessV1(partialResolution.input);
assert.equal(partialReadiness.verdict, "not_ready", "Partial live context should remain conservative and not_ready.");
assert.ok(
  partialReadiness.blockers.some((blocker) => blocker.category === "medication_reconciliation"),
  "Expected partial live context to preserve medication blocker visibility.",
);
assert.ok(
  partialReadiness.blockers.some((blocker) => blocker.category === "patient_education"),
  "Expected partial live context to preserve missing-note education blocker visibility.",
);

  const fallbackResolution = await resolveWorkflowInputForRequest(makeRequest({}), {});
  assert.equal(
    fallbackResolution.source,
    "synthetic_fallback",
    "Expected synthetic fallback when Prompt Opinion FHIR context is absent.",
  );
  assert.equal(
    fallbackResolution.context_status,
    "missing",
    "Expected absent live context to be marked as missing before fallback.",
  );
  const fallbackReadiness = assessDischargeReadinessV1(fallbackResolution.input);
  assert.equal(
    fallbackReadiness.verdict,
    "not_ready",
    "Expected synthetic fallback to preserve the primary demo scenario verdict.",
  );
  assert.equal(
    fallbackResolution.input.scenario_id,
    "first_synthetic_discharge_slice_v1",
    "Expected synthetic fallback to preserve the default scenario path.",
  );

  console.log("SMOKE PASS: live context evidence ingest");
  console.log(
    JSON.stringify(
      {
        live_source: liveResolution.source,
        live_context_status: liveResolution.context_status,
        live_note_document_count: liveResolution.input.note_documents?.length ?? 0,
        live_evidence_count: liveReadiness.evidence.length,
        partial_context_status: partialResolution.context_status,
        partial_issue_count: partialResolution.issues.length,
        fallback_source: fallbackResolution.source,
        fallback_scenario_id: fallbackResolution.input.scenario_id,
      },
      null,
      2,
    ),
  );
};

void main();
