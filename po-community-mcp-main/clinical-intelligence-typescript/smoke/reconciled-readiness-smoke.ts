import assert from "node:assert/strict";
import { assessReconciledDischargeReadiness } from "../clinical-intelligence/reconciled-discharge-readiness";

const main = async (): Promise<void> => {
  const payload = await assessReconciledDischargeReadiness({
    responseMode: "prompt_opinion_slim",
  });

  if (payload.clinical_intelligence_status === "error") {
    throw new Error(
      `Clinical Intelligence provider failed: provider=${payload.provider_evidence.configured_provider}; model=${payload.provider_evidence.model}; key_present=${payload.provider_evidence.key_present}; hidden_risk_output_provider=${payload.provider_evidence.hidden_risk_output_provider}; summary=${payload.contradiction_summary}`,
    );
  }

  assert.equal(payload.structured_posture, "ready");
  assert.equal(payload.contract_version, "phase9_reconciled_readiness_v1");
  assert.equal(payload.clinical_intelligence_status, "ok");
  assert.equal(payload.narrative_source_count > 0, true);
  assert.equal(payload.hidden_risk_result, "hidden_risk_present");
  assert.equal(payload.final_verdict, "not_ready");
  assert.equal(payload.transition_safety_packet.packet_type, "transition_safety_packet");
  assert.equal(
    payload.transition_safety_packet.contract_version,
    "phase9_transition_safety_packet_v1",
  );
  assert.equal(payload.transition_safety_packet.patient.patient_id, "phase0-trap-maria-alvarez");
  assert.equal(payload.transition_safety_packet.patient.encounter_id, "enc-phase0-trap-001");
  assert.equal(payload.transition_safety_packet.structured_baseline.verdict, "ready");
  assert.equal(
    payload.transition_safety_packet.narrative_review.hidden_risk_result,
    "hidden_risk_present",
  );
  assert.equal(
    payload.transition_safety_packet.reconciled_transition_status.final_verdict,
    "not_ready",
  );
  assert.equal(
    Object.values(payload.transition_safety_packet.safety_invariants).every(
      (status) => status === "pass",
    ),
    true,
  );
  assert.equal(payload.provider_evidence.configured_provider, "google");
  assert.equal(payload.provider_evidence.model, "gemma-4-31b-it");
  assert.equal(payload.provider_evidence.key_present, true);
  assert.equal(payload.provider_evidence.hidden_risk_output_provider, "google");

  for (const category of [
    "clinical_stability",
    "equipment_and_transport",
    "home_support_and_services",
  ]) {
    assert.ok(
      payload.blocker_categories.includes(category),
      `Reconciled Prompt 1 payload missing blocker category ${category}.`,
    );
  }

  for (const source of [
    "Nursing Note 2026-04-18 20:40",
    "Case Management Addendum 2026-04-18 20:55",
  ]) {
    assert.ok(
      payload.evidence_contains.some((label) => label.includes(source)),
      `Reconciled Prompt 1 payload missing evidence source ${source}.`,
    );
    assert.ok(
      payload.prompt_opinion_visible_answer.includes(source),
      `Visible Prompt 1 answer missing evidence source ${source}.`,
    );
    assert.ok(
      payload.transition_safety_packet.narrative_review.citations.some((citation) =>
        citation.source_label.includes(source),
      ),
      `Transition Safety Packet missing evidence source ${source}.`,
    );
  }

  assert.ok(
    payload.prompt_opinion_visible_answer.includes("Final verdict: not_ready"),
    "Visible Prompt 1 answer must include final not_ready.",
  );
  assert.ok(
    payload.prompt_opinion_visible_answer.includes("Structured baseline posture: ready"),
    "Visible Prompt 1 answer must include structured baseline ready.",
  );

  const serialized = JSON.stringify(payload);
  assert.ok(
    serialized.length <= 6500,
    `Reconciled Prompt 1 payload must stay compact while carrying the Phase 9 packet, saw ${serialized.length} bytes.`,
  );
  assert.ok(
    payload.prompt_opinion_visible_answer.split(/\s+/).length <= 90,
    "Visible Prompt 1 answer must stay compact for Prompt Opinion.",
  );

  console.log("SMOKE PASS: reconciled readiness");
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
