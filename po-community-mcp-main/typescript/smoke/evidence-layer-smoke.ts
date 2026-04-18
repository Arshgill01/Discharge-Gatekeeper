import assert from "node:assert/strict";
import {
  BlockerCategory,
  EvidenceSourceType,
  ReadinessInput,
} from "../discharge-readiness/contract";
import { buildNormalizedEvidenceBundle } from "../discharge-readiness/evidence-layer";
import { FIRST_SYNTHETIC_SCENARIO_V1 } from "../discharge-readiness/scenario-v1";
import { SECOND_SYNTHETIC_SCENARIO_V1 } from "../discharge-readiness/scenario-v2";
import { THIRD_SYNTHETIC_SCENARIO_V1 } from "../discharge-readiness/scenario-v3";
import { THIRD_SYNTHETIC_SCENARIO_AMBIGUITY_V1 } from "../discharge-readiness/scenario-fixtures";

const deepCloneInput = (input: ReadinessInput): ReadinessInput => {
  return JSON.parse(JSON.stringify(input)) as ReadinessInput;
};

const EXPECTED_STRUCTURED_SIGNAL_COUNT = 9;
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

const assertSuccessBundle = (
  label: string,
  input: ReadinessInput,
  expectedNoteCategories: BlockerCategory[],
  expectedSourceTypes: EvidenceSourceType[],
): void => {
  const bundle = buildNormalizedEvidenceBundle(input);

  assert.equal(
    bundle.structured_signals.length,
    EXPECTED_STRUCTURED_SIGNAL_COUNT,
    `${label}: structured signal count drifted.`,
  );

  const structuredSignalKeys = new Set(
    bundle.structured_signals.map((signal) => `${signal.category}:${signal.signal_key}`),
  );
  for (const signalKey of expectedStructuredSignals) {
    assert.ok(structuredSignalKeys.has(signalKey), `${label}: missing structured signal ${signalKey}`);
  }

  const noteSignalCategories = new Set(
    bundle.note_document_signals.map((signal) => signal.category),
  );
  for (const category of expectedNoteCategories) {
    assert.ok(noteSignalCategories.has(category), `${label}: missing note/document signal category ${category}`);
  }

  const sourceTypes = new Set(bundle.note_document_signals.map((signal) => signal.source_type));
  for (const sourceType of expectedSourceTypes) {
    assert.ok(sourceTypes.has(sourceType), `${label}: missing note/document source type ${sourceType}`);
  }

  assert.equal(bundle.contradictions.length, 0, `${label}: contradictions should be absent.`);
  assert.equal(bundle.ambiguities.length, 0, `${label}: ambiguities should be absent.`);
  assert.equal(bundle.missing_evidence.length, 0, `${label}: missing evidence markers should be absent.`);

  for (const signal of [...bundle.structured_signals, ...bundle.note_document_signals]) {
    assert.ok(signal.source_id.length > 0, `${label}: signal ${signal.id} has no source id.`);
    assert.ok(signal.source_label.length > 0, `${label}: signal ${signal.id} has no source label.`);
    const sourceRecord = bundle.evidence_catalog.find((record) => record.id === signal.source_id);
    assert.ok(sourceRecord, `${label}: signal ${signal.id} references unknown source ${signal.source_id}.`);
  }
};

assertSuccessBundle(
  "primary",
  FIRST_SYNTHETIC_SCENARIO_V1,
  [
    "medication_reconciliation",
    "follow_up_and_referrals",
    "patient_education",
    "home_support_and_services",
    "equipment_and_transport",
  ],
  ["note"],
);
assertSuccessBundle(
  "second",
  SECOND_SYNTHETIC_SCENARIO_V1,
  [
    "medication_reconciliation",
    "follow_up_and_referrals",
    "patient_education",
    "home_support_and_services",
    "equipment_and_transport",
    "administrative_and_documentation",
  ],
  ["note", "document"],
);
assertSuccessBundle(
  "third",
  THIRD_SYNTHETIC_SCENARIO_V1,
  [
    "clinical_stability",
    "medication_reconciliation",
    "follow_up_and_referrals",
    "patient_education",
    "home_support_and_services",
    "equipment_and_transport",
    "administrative_and_documentation",
  ],
  ["note", "document"],
);

const ambiguityBundle = buildNormalizedEvidenceBundle(THIRD_SYNTHETIC_SCENARIO_AMBIGUITY_V1);
assert.ok(
  ambiguityBundle.contradictions.some(
    (marker) =>
      marker.category === "clinical_stability" &&
      marker.signal_key === "assertion_clinical_stability",
  ),
  "Expected contradiction marker for clinical stability when readiness and blocker signals conflict.",
);
assert.ok(
  ambiguityBundle.ambiguities.some(
    (marker) =>
      marker.category === "medication_reconciliation" &&
      marker.signal_key === "assertion_medication_reconciliation",
  ),
  "Expected ambiguity marker for medication reconciliation when note evidence stays uncertain.",
);

const missingEvidenceInput = deepCloneInput(SECOND_SYNTHETIC_SCENARIO_V1);
missingEvidenceInput.note_documents = [];
missingEvidenceInput.evidence_catalog = missingEvidenceInput.evidence_catalog.filter(
  (evidence) => evidence.source_type === "structured" || evidence.source_type === "document",
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
assert.ok(
  missingEvidenceBundle.missing_evidence.some(
    (marker) =>
      marker.category === "follow_up_and_referrals" &&
      marker.signal_key === "follow_up_coordination_status" &&
      marker.expected_source === "note",
  ),
  "Expected missing note evidence marker for follow-up coordination.",
);

console.log("SMOKE PASS: evidence layer normalization");
console.log(
  JSON.stringify(
    {
      scenario_count: 3,
      contradiction_count: ambiguityBundle.contradictions.length,
      ambiguity_count: ambiguityBundle.ambiguities.length,
      missing_evidence_count: missingEvidenceBundle.missing_evidence.length,
    },
    null,
    2,
  ),
);
