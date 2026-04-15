import assert from "node:assert/strict";
import { BlockerCategory, ReadinessInput } from "../discharge-readiness/contract";
import { buildNormalizedEvidenceBundle } from "../discharge-readiness/evidence-layer";
import { FIRST_SYNTHETIC_SCENARIO_V1 } from "../discharge-readiness/scenario-v1";

const deepCloneInput = (input: ReadinessInput): ReadinessInput => {
  return JSON.parse(JSON.stringify(input)) as ReadinessInput;
};

const bundle = buildNormalizedEvidenceBundle(FIRST_SYNTHETIC_SCENARIO_V1);

const structuredSignalKeys = new Set(
  bundle.structured_signals.map((signal) => `${signal.category}:${signal.signal_key}`),
);
const expectedStructuredSignals = [
  "clinical_stability:vitals_stable",
  "clinical_stability:oxygen_requirement",
  "pending_diagnostics:diagnostics_status",
  "medication_reconciliation:medication_reconciliation_status",
  "follow_up_and_referrals:follow_up_coordination_status",
  "patient_education:teach_back_status",
  "home_support_and_services:home_support_status",
  "equipment_and_transport:equipment_and_transport_status",
  "administrative_and_documentation:documentation_status",
];

for (const signalKey of expectedStructuredSignals) {
  assert.ok(
    structuredSignalKeys.has(signalKey),
    `Missing structured normalized signal: ${signalKey}`,
  );
}

const noteSignalCategories = new Set(
  bundle.note_document_signals.map((signal) => signal.category),
);
const expectedNoteCategories: BlockerCategory[] = [
  "medication_reconciliation",
  "follow_up_and_referrals",
  "patient_education",
  "home_support_and_services",
  "equipment_and_transport",
];

for (const category of expectedNoteCategories) {
  assert.ok(noteSignalCategories.has(category), `Missing note-derived signal category: ${category}`);
}

for (const signal of [...bundle.structured_signals, ...bundle.note_document_signals]) {
  assert.ok(signal.source_id.length > 0, `Signal ${signal.id} has no source id.`);
  assert.ok(signal.source_label.length > 0, `Signal ${signal.id} has no source label.`);
  const sourceRecord = bundle.evidence_catalog.find((record) => record.id === signal.source_id);
  assert.ok(sourceRecord, `Signal ${signal.id} references unknown source ${signal.source_id}.`);
}

const contradictoryInput = deepCloneInput(FIRST_SYNTHETIC_SCENARIO_V1);
contradictoryInput.evidence_catalog.push({
  id: "note-med-rec-cleared",
  source_type: "note",
  source_label: "Medication reconciliation addendum",
  detail: "Addendum states medication reconciliation appears complete.",
});
contradictoryInput.note_documents = [
  ...(contradictoryInput.note_documents ?? []),
  {
    id: "med-rec-addendum-note",
    source_type: "note",
    source_label: "Medication reconciliation addendum",
    signals: [
      {
        id: "med-rec-supporting-signal",
        category: "medication_reconciliation",
        signal_key: "medication_reconciliation_status",
        state: "supports_readiness",
        detail:
          "Addendum indicates medication reconciliation is complete pending final clinician sign-off.",
        source_evidence_id: "note-med-rec-cleared",
      },
    ],
  },
];

const contradictoryBundle = buildNormalizedEvidenceBundle(contradictoryInput);
assert.ok(
  contradictoryBundle.contradictions.some(
    (marker) =>
      marker.category === "medication_reconciliation" &&
      marker.signal_key === "medication_reconciliation_status",
  ),
  "Expected contradiction marker for medication reconciliation when note signals conflict.",
);

const missingEvidenceInput = deepCloneInput(FIRST_SYNTHETIC_SCENARIO_V1);
missingEvidenceInput.note_documents = [];
missingEvidenceInput.evidence_catalog = missingEvidenceInput.evidence_catalog.filter(
  (evidence) => evidence.source_type === "structured",
);

const missingEvidenceBundle = buildNormalizedEvidenceBundle(missingEvidenceInput);
assert.ok(
  missingEvidenceBundle.missing_evidence.some(
    (marker) =>
      marker.category === "medication_reconciliation" &&
      marker.signal_key === "medication_reconciliation_status" &&
      marker.expected_source === "note",
  ),
  "Expected missing note evidence marker for medication reconciliation.",
);

console.log("SMOKE PASS: evidence layer normalization");
console.log(
  JSON.stringify(
    {
      structured_signal_count: bundle.structured_signals.length,
      note_signal_count: bundle.note_document_signals.length,
      contradiction_count: contradictoryBundle.contradictions.length,
      missing_evidence_count: missingEvidenceBundle.missing_evidence.length,
    },
    null,
    2,
  ),
);
