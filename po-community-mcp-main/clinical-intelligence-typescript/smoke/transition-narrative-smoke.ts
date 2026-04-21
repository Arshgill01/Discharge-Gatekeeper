import assert from "node:assert/strict";
import { synthesizeTransitionNarrative } from "../clinical-intelligence/synthesize-transition-narrative";
import {
  NO_RISK_CONTROL_INPUT,
  PHASE0_TRAP_PATIENT_INPUT,
} from "../clinical-intelligence/fixtures";
import {
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
    payload.narrative.includes("Primary evidence:"),
    "Narrative should remain explicitly grounded in note citations.",
  );
  assert.ok(
    /licensed clinical team|clinician/.test(payload.safety_boundary),
    "Narrative output must keep assistive non-autonomous framing.",
  );
  assert.ok(payload.recommended_actions.length > 0);
  const hiddenRiskActions = payload.recommended_actions.filter(
    (action) => action.linked_categories.length > 0 || action.citation_ids.length > 0,
  );
  assert.ok(hiddenRiskActions.length > 0, "Trap narrative must include hidden-risk-grounded actions.");
  if (TRAP_TRANSITION_NARRATIVE_EXPECTED_MATRIX.grounded_action_policy.require_linked_categories_for_hidden_risk) {
    assert.ok(
      hiddenRiskActions.every((action) => action.linked_categories.length > 0),
      "Trap hidden-risk actions must map to hidden-risk categories.",
    );
  }
  if (TRAP_TRANSITION_NARRATIVE_EXPECTED_MATRIX.grounded_action_policy.require_action_citations_for_hidden_risk) {
    assert.ok(
      hiddenRiskActions.every((action) => action.citation_ids.length > 0),
      "Trap hidden-risk actions must include supporting citation ids.",
    );
  }
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
  await assertControlNarrative();
  console.log("SMOKE PASS: transition narrative synthesis");
};

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
