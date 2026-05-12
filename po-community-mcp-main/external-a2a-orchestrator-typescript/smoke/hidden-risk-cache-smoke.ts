import assert from "node:assert/strict";
import { buildCacheKey, HiddenRiskCache, parseHiddenRiskCacheConfig } from "../hidden-risk-cache";
import { DeterministicResponse, HiddenRiskResponse } from "../types";
import { TRAP_PATIENT_TASK_INPUT } from "../orchestrator/fixtures";

const deterministic: DeterministicResponse = {
  verdict: "ready",
  blockers: [
    {
      id: "b1",
      category: "clinical_stability",
      priority: "high",
      description: "structured blocker",
      evidence: ["e1"],
      actionability: "actionable",
    },
  ],
  evidence: [
    {
      id: "e1",
      source_type: "structured",
      source_label: "Structured Snapshot",
      detail: "Resting oxygenation stable.",
    },
  ],
  next_steps: [
    {
      id: "n1",
      priority: "high",
      action: "confirm exertional oxygen needs",
      owner: "primary team",
      linked_blockers: ["b1"],
      linked_evidence: ["e1"],
      blocker_trust_state: "trusted",
      trace_summary: "structured baseline",
    },
  ],
  summary: "Structured baseline ready.",
};

const hiddenRisk: HiddenRiskResponse = {
  contract_version: "phase0_hidden_risk_v1",
  status: "ok",
  patient_id: "phase0-trap-maria-alvarez",
  encounter_id: "enc-phase0-trap-001",
  baseline_verdict: "ready",
  hidden_risk_summary: {
    result: "hidden_risk_present",
    overall_disposition_impact: "not_ready",
    confidence: "high",
    summary: "Narrative contradiction changes discharge posture.",
    manual_review_required: true,
    false_positive_guardrail: "Anchored to cited notes.",
  },
  hidden_risk_findings: [
    {
      finding_id: "hr1",
      title: "Exertional desaturation and unsafe home setup",
      category: "clinical_stability",
      disposition_impact: "not_ready",
      confidence: "high",
      is_duplicate_of_blocker_id: null,
      rationale: "Nursing Note 2026-04-18 20:40 and Case Management Addendum 2026-04-18 20:55 conflict with baseline.",
      recommended_orchestrator_action: "add_blocker",
      citation_ids: ["cit1", "cit2"],
    },
  ],
  citations: [
    {
      citation_id: "cit1",
      source_type: "nursing_note",
      source_label: "Nursing Note 2026-04-18 20:40",
      locator: "full note",
      excerpt: "SpO2 dropped to 82%.",
    },
    {
      citation_id: "cit2",
      source_type: "case_management_note",
      source_label: "Case Management Addendum 2026-04-18 20:55",
      locator: "summary",
      excerpt: "Home oxygen delivery delayed until tomorrow.",
    },
  ],
  review_metadata: {
    narrative_sources_reviewed: 3,
    duplicate_findings_suppressed: 0,
    weak_findings_suppressed: 0,
  },
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const run = (): void => {
  const config = parseHiddenRiskCacheConfig({
    A2A_HIDDEN_RISK_CACHE_ENABLED: "true",
    A2A_HIDDEN_RISK_CACHE_TTL_MS: "60000",
    A2A_HIDDEN_RISK_CACHE_MAX_ENTRIES: "2",
  });
  const cache = new HiddenRiskCache(config);

  const key = buildCacheKey(deterministic, TRAP_PATIENT_TASK_INPUT, "http://127.0.0.1:5056/mcp", "google", "gemma-4-31b-it");
  const sameKey = buildCacheKey(clone(deterministic), clone(TRAP_PATIENT_TASK_INPUT), "http://127.0.0.1:5056/mcp", "google", "gemma-4-31b-it");
  assert.equal(key, sameKey);

  const changedInput = clone(TRAP_PATIENT_TASK_INPUT);
  changedInput.patient_context!.narrative_evidence_bundle![1].excerpt += " Additional changed detail.";
  const changedNarrativeKey = buildCacheKey(deterministic, changedInput, "http://127.0.0.1:5056/mcp", "google", "gemma-4-31b-it");
  assert.notEqual(key, changedNarrativeKey);

  const changedDeterministic = clone(deterministic);
  changedDeterministic.evidence[0].id = "e2";
  const changedDeterministicKey = buildCacheKey(changedDeterministic, TRAP_PATIENT_TASK_INPUT, "http://127.0.0.1:5056/mcp", "google", "gemma-4-31b-it");
  assert.notEqual(key, changedDeterministicKey);

  assert.equal(cache.get(key), null);
  assert.equal(cache.set(key, hiddenRisk, "google", "gemma-4-31b-it", 3), true);
  const hit = cache.get(key);
  assert.ok(hit);
  assert.equal(hit.hiddenRiskResult, "hidden_risk_present");
  assert.equal(hit.evidenceAnchorCheck.hasNursingNote20260418, true);
  assert.equal(hit.evidenceAnchorCheck.hasCaseManagementAddendum20260418, true);

  const noHiddenRisk = clone(hiddenRisk);
  noHiddenRisk.hidden_risk_summary.result = "no_hidden_risk";
  assert.equal(cache.set("no-risk", noHiddenRisk, "google", "gemma-4-31b-it", 3), false);

  const missingAnchor = clone(hiddenRisk);
  missingAnchor.citations = missingAnchor.citations.slice(0, 1);
  missingAnchor.hidden_risk_findings[0].rationale = "Only the nursing note is cited.";
  assert.equal(cache.set("missing-anchor", missingAnchor, "google", "gemma-4-31b-it", 3), false);

  const heldOutPatient = clone(hiddenRisk);
  heldOutPatient.patient_id = "db4b066b-200f-405f-9fe4-c52eefbc1425";
  heldOutPatient.encounter_id = "daniel-discharge-2026-0419";
  heldOutPatient.citations = [
    {
      citation_id: "daniel-1",
      source_type: "pharmacy_note",
      source_label: "Pharmacy Note 2026-04-19 18:15",
      locator: "DocumentReference/cbd60b4b-e4af-4657-8ad7-df51cd782e69",
      excerpt: "Patient cannot afford required medications.",
    },
    {
      citation_id: "daniel-2",
      source_type: "nursing_note",
      source_label: "Nursing Note 2026-04-19 18:40",
      locator: "DocumentReference/7978a116-881e-4280-871f-1c16c59dc500",
      excerpt: "Patient gained 1.8 kg, indicating potential fluid retention and instability.",
    },
  ];
  heldOutPatient.hidden_risk_findings[0].citation_ids = ["daniel-1", "daniel-2"];
  assert.equal(cache.set("held-out-patient", heldOutPatient, "google", "gemini-3.1-flash-lite", 2), true);

  const disabled = new HiddenRiskCache(parseHiddenRiskCacheConfig({ A2A_HIDDEN_RISK_CACHE_ENABLED: "false" }));
  assert.equal(disabled.set("disabled", hiddenRisk, "google", "gemma-4-31b-it", 3), false);
  assert.equal(disabled.get("disabled"), null);

  const warmOnly = new HiddenRiskCache(parseHiddenRiskCacheConfig({ A2A_HIDDEN_RISK_CACHE_WARM_ONLY: "true" }));
  assert.equal(warmOnly.set("warm-only", hiddenRisk, "google", "gemma-4-31b-it", 3), true);
  assert.equal(warmOnly.get("warm-only"), null);

  console.log("PASS hidden-risk cache smoke");
};

run();
