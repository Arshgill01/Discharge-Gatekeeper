import assert from "node:assert/strict";
import { synthesizeTransitionNarrative } from "../clinical-intelligence/synthesize-transition-narrative";
import {
  NO_RISK_CONTROL_INPUT,
  PHASE0_TRAP_PATIENT_INPUT,
} from "../clinical-intelligence/fixtures";

const assertTrapNarrative = async (): Promise<void> => {
  const payload = await synthesizeTransitionNarrative(PHASE0_TRAP_PATIENT_INPUT);
  assert.equal(payload.contract_version, "phase0_transition_narrative_v1");
  assert.equal(payload.status, "ok");
  assert.equal(payload.proposed_disposition, "not_ready");
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
};

const assertControlNarrative = async (): Promise<void> => {
  const payload = await synthesizeTransitionNarrative(NO_RISK_CONTROL_INPUT);
  assert.equal(payload.status, "ok");
  assert.equal(payload.proposed_disposition, "ready");
  assert.ok(
    payload.narrative.includes("did not surface additional discharge-changing hidden risk"),
    "Control narrative should avoid generic escalation when there is no hidden risk.",
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
