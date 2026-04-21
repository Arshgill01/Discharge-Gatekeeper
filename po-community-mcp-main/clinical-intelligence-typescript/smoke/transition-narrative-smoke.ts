import assert from "node:assert/strict";
import { synthesizeTransitionNarrative } from "../clinical-intelligence/synthesize-transition-narrative";
import {
  ALTERNATIVE_HIDDEN_RISK_INPUT,
  NO_RISK_CONTROL_INPUT,
  PHASE0_TRAP_PATIENT_INPUT,
} from "../clinical-intelligence/fixtures";
import {
  ALTERNATIVE_TRANSITION_NARRATIVE_EXPECTED_MATRIX,
  CONTROL_TRANSITION_NARRATIVE_EXPECTED_MATRIX,
  TRAP_TRANSITION_NARRATIVE_EXPECTED_MATRIX,
} from "../clinical-intelligence/expected-output-matrix";

const assertTrapNarrative = async (): Promise<void> => {
  const payload = await synthesizeTransitionNarrative(PHASE0_TRAP_PATIENT_INPUT);
  assert.equal(payload.contract_version, "phase0_transition_narrative_v1");
  assert.equal(payload.status, "ok");
  assert.equal(
    payload.proposed_disposition,
    TRAP_TRANSITION_NARRATIVE_EXPECTED_MATRIX.expected_proposed_disposition,
  );
  assert.ok(
    payload.narrative.includes("Deterministic discharge posture was ready"),
    "Narrative must preserve baseline deterministic context.",
  );
  assert.ok(
    payload.narrative.includes("citations:"),
    "Narrative should remain explicitly grounded in note citations.",
  );
  assert.ok(
    /licensed clinical team|clinician/.test(payload.safety_boundary),
    "Narrative output must keep assistive non-autonomous framing.",
  );
  assert.ok(payload.recommended_actions.length > 0);
  if (TRAP_TRANSITION_NARRATIVE_EXPECTED_MATRIX.grounded_action_policy.require_linked_categories_for_hidden_risk) {
    assert.ok(
      payload.recommended_actions.every((action) => action.linked_categories.length > 0),
      "Trap narrative actions must map to hidden-risk categories.",
    );
  }
  if (TRAP_TRANSITION_NARRATIVE_EXPECTED_MATRIX.grounded_action_policy.require_action_citations_for_hidden_risk) {
    assert.ok(
      payload.recommended_actions.every((action) => action.citation_ids.length > 0),
      "Trap narrative actions must include supporting citation ids.",
    );
  }
};

const assertAlternativeNarrative = async (): Promise<void> => {
  const payload = await synthesizeTransitionNarrative(ALTERNATIVE_HIDDEN_RISK_INPUT);
  assert.equal(payload.status, "ok");
  assert.equal(
    payload.proposed_disposition,
    ALTERNATIVE_TRANSITION_NARRATIVE_EXPECTED_MATRIX.expected_proposed_disposition,
  );
  assert.ok(
    payload.narrative.includes("Deterministic discharge posture was ready"),
    "Alternative hidden-risk narrative must preserve baseline deterministic context.",
  );
  assert.ok(
    payload.recommended_actions.every((action) => action.linked_categories.includes("home_support_and_services")),
    "Alternative hidden-risk actions should stay tied to home-support risk.",
  );
  assert.ok(
    payload.citations.some((citation) => citation.source_label.includes("Case Management Escalation Note 2026-04-18 21:05")),
    "Alternative hidden-risk narrative must cite the case-management escalation note.",
  );
};

const assertControlNarrative = async (): Promise<void> => {
  const payload = await synthesizeTransitionNarrative(NO_RISK_CONTROL_INPUT);
  assert.equal(payload.status, "ok");
  assert.equal(
    payload.proposed_disposition,
    CONTROL_TRANSITION_NARRATIVE_EXPECTED_MATRIX.expected_proposed_disposition,
  );
  assert.ok(
    payload.narrative.includes("did not surface additional discharge-changing hidden risk"),
    "Control narrative should avoid generic escalation when there is no hidden risk.",
  );
  assert.ok(
    payload.recommended_actions.length > 0,
    "Control narrative must still provide deterministic next-step actions.",
  );
  assert.ok(
    payload.recommended_actions.every((action) => action.citation_ids.length === 0),
    "Control narrative actions should not invent citations when no hidden risk exists.",
  );
};

const main = async (): Promise<void> => {
  await assertTrapNarrative();
  await assertAlternativeNarrative();
  await assertControlNarrative();
  console.log("SMOKE PASS: transition narrative synthesis");
};

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
