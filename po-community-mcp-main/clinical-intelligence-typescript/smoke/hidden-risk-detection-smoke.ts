import assert from "node:assert/strict";
import { surfaceHiddenRisks } from "../clinical-intelligence/surface-hidden-risks";
import {
  NO_RISK_CONTROL_INPUT,
  PHASE0_TRAP_PATIENT_INPUT,
} from "../clinical-intelligence/fixtures";

const assertTrapPatientBehavior = async (): Promise<void> => {
  const result = await surfaceHiddenRisks(PHASE0_TRAP_PATIENT_INPUT);
  const payload = result.payload;

  assert.equal(payload.contract_version, "phase0_hidden_risk_v1");
  assert.equal(payload.status, "ok");
  assert.equal(payload.hidden_risk_summary.result, "hidden_risk_present");
  assert.equal(payload.hidden_risk_findings.length > 0, true);

  const categories = new Set(payload.hidden_risk_findings.map((finding) => finding.category));
  assert.ok(categories.has("clinical_stability"));
  assert.ok(categories.has("equipment_and_transport"));
  assert.ok(categories.has("home_support_and_services"));

  const citedSourceLabels = new Set(payload.citations.map((citation) => citation.source_label));
  assert.ok(
    [...citedSourceLabels].some((label) => label.includes("Nursing Note 2026-04-18 20:40")),
    "Expected hidden-risk output to cite the canonical contradiction nursing note.",
  );

  for (const finding of payload.hidden_risk_findings) {
    assert.ok(finding.citation_ids.length > 0, `Finding ${finding.finding_id} is missing citations.`);
    for (const citationId of finding.citation_ids) {
      assert.ok(
        payload.citations.some((citation) => citation.citation_id === citationId),
        `Finding ${finding.finding_id} references unknown citation ${citationId}.`,
      );
    }
  }
};

const assertControlNoRiskBehavior = async (): Promise<void> => {
  const result = await surfaceHiddenRisks(NO_RISK_CONTROL_INPUT);
  const payload = result.payload;

  assert.equal(payload.status, "ok");
  assert.equal(payload.hidden_risk_summary.result, "no_hidden_risk");
  assert.equal(payload.hidden_risk_summary.overall_disposition_impact, "none");
  assert.equal(payload.hidden_risk_findings.length, 0);
};

const main = async (): Promise<void> => {
  await assertTrapPatientBehavior();
  await assertControlNoRiskBehavior();
  console.log("SMOKE PASS: hidden-risk detection");
};

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
