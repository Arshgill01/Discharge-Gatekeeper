import assert from "node:assert/strict";
import { synthesizeTransitionNarrative } from "../clinical-intelligence/synthesize-transition-narrative";
import {
  DEFAULT_HIDDEN_RISK_SCENARIO_ID,
  resolveHiddenRiskToolInput,
} from "../tools/canonical-hidden-risk-input";
import {
  ALTERNATIVE_HIDDEN_RISK_INPUT,
  INCONCLUSIVE_CONTEXT_INPUT,
  NO_RISK_CONTROL_INPUT,
  PHASE0_TRAP_PATIENT_INPUT,
} from "../clinical-intelligence/fixtures";
import {
  ALTERNATIVE_TRANSITION_NARRATIVE_EXPECTED_MATRIX,
  CONTROL_TRANSITION_NARRATIVE_EXPECTED_MATRIX,
  INCONCLUSIVE_TRANSITION_NARRATIVE_EXPECTED_MATRIX,
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
    payload.narrative.includes("Final posture is not_ready"),
    "Narrative must preserve the final escalated posture.",
  );
  assert.ok(
    payload.narrative.includes("Evidence anchors:"),
    "Narrative should remain explicitly grounded in note citations.",
  );
  assert.ok(
    /licensed clinical team|clinician/.test(payload.safety_boundary),
    "Narrative output must keep assistive non-autonomous framing.",
  );
  assert.ok(payload.recommended_actions.length > 0);
  assert.ok(
    payload.key_points.some((point) => point.includes("Clinician handoff brief:")),
    "Trap narrative should include a clinician handoff brief.",
  );
  assert.ok(
    payload.key_points.some((point) => point.includes("Patient-facing guidance:")),
    "Trap narrative should include patient-facing hold guidance.",
  );
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

const assertAlternativeNarrative = async (): Promise<void> => {
  const payload = await synthesizeTransitionNarrative(ALTERNATIVE_HIDDEN_RISK_INPUT);
  assert.equal(payload.status, "ok");
  assert.equal(
    payload.proposed_disposition,
    ALTERNATIVE_TRANSITION_NARRATIVE_EXPECTED_MATRIX.expected_proposed_disposition,
  );
  assert.ok(
    payload.narrative.includes("Final posture is not_ready"),
    "Alternative hidden-risk narrative must preserve the final escalated posture.",
  );
  assert.ok(
    payload.recommended_actions.length > 0,
    "Alternative hidden-risk narrative should return actionable guidance.",
  );
  assert.ok(
    payload.key_points.some((point) => point.includes("Top pre-discharge actions:")),
    "Alternative hidden-risk narrative should summarize top pre-discharge actions.",
  );
  const hiddenRiskActions = payload.recommended_actions.filter(
    (action) => action.linked_categories.length > 0 || action.citation_ids.length > 0,
  );
  assert.ok(hiddenRiskActions.length > 0, "Alternative hidden-risk narrative must include risk-grounded actions.");
  assert.ok(
    hiddenRiskActions.every((action) => action.linked_categories.includes("home_support_and_services")),
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
    payload.narrative.includes("Final posture remains ready"),
    "Control narrative should preserve the unchanged final posture.",
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
    payload.key_points.some((point) => point.includes("Patient-facing guidance:")),
    "Control narrative should still include patient-facing guidance.",
  );
  assert.ok(
    payload.recommended_actions.every((action) => action.citation_ids.length === 0),
    "Control narrative actions should not invent citations when no hidden risk exists.",
  );
};

const assertInconclusiveNarrative = async (): Promise<void> => {
  const payload = await synthesizeTransitionNarrative(INCONCLUSIVE_CONTEXT_INPUT);
  assert.equal(payload.status, "insufficient_context");
  assert.equal(
    payload.proposed_disposition,
    INCONCLUSIVE_TRANSITION_NARRATIVE_EXPECTED_MATRIX.expected_proposed_disposition,
  );
  assert.equal(payload.manual_review_required, true);
  assert.ok(
    payload.narrative.includes("Manual clinician review is required"),
    "Inconclusive narrative must require manual review explicitly.",
  );
  assert.ok(
    payload.recommended_actions.some((action) =>
      action.action.includes("manual review before discharge proceeds"),
    ),
    "Inconclusive narrative must include an explicit manual-review action.",
  );
  assert.ok(
    payload.key_points.some((point) => point.includes("Clinician handoff brief:")),
    "Inconclusive narrative should include a clinician handoff brief.",
  );
};

const assertPromptOpinionSlimNarrativeStaysRenderSafe = async (): Promise<void> => {
  const payload = await synthesizeTransitionNarrative(PHASE0_TRAP_PATIENT_INPUT, {
    responseMode: "prompt_opinion_slim",
  });
  const serialized = JSON.stringify(payload);

  assert.ok(
    serialized.length <= 4800,
    `Prompt Opinion slim transition payload should stay compact (<=4800 bytes), saw ${serialized.length}.`,
  );
  assert.ok(
    payload.narrative.includes("Before discharge, complete:"),
    "Slim Prompt 3 narrative should stay action-explicit for transition-package rendering.",
  );
  assert.ok(payload.key_points.length <= 6, "Slim Prompt 3 key points should stay bounded.");
  assert.ok(payload.recommended_actions.length <= 4, "Slim Prompt 3 actions should stay bounded.");
  assert.ok(payload.citations.length <= 4, "Slim Prompt 3 citations should stay bounded.");

  for (const action of payload.recommended_actions) {
    assert.ok(
      action.action.length <= 220,
      `Slim action ${action.action_id} should stay bounded for transcript safety.`,
    );
    assert.ok(
      action.citation_ids.length <= 2,
      `Slim action ${action.action_id} should cap citation references for transcript safety.`,
    );
  }

  for (const keyPoint of payload.key_points) {
    assert.ok(
      keyPoint.length <= 220,
      "Slim key points should stay bounded for transcript safety.",
    );
  }
};

const assertPromptOpinionScenarioShortcutResolvesCanonicalInput = (): void => {
  const input = resolveHiddenRiskToolInput(
    { scenario_id: DEFAULT_HIDDEN_RISK_SCENARIO_ID },
    "Prompt 3 Direct-MCP concise transition package using compact canonical scenario input.",
  );

  assert.equal(input.deterministic_snapshot.baseline_verdict, "ready");
  assert.equal(
    input.narrative_evidence_bundle.length,
    PHASE0_TRAP_PATIENT_INPUT.narrative_evidence_bundle.length,
  );
  assert.equal(
    input.optional_context_metadata?.explicit_task_goal,
    "Prompt 3 Direct-MCP concise transition package using compact canonical scenario input.",
  );
};

const main = async (): Promise<void> => {
  await assertTrapNarrative();
  await assertAlternativeNarrative();
  await assertControlNarrative();
  await assertInconclusiveNarrative();
  await assertPromptOpinionSlimNarrativeStaysRenderSafe();
  assertPromptOpinionScenarioShortcutResolvesCanonicalInput();
  console.log("SMOKE PASS: transition narrative synthesis");
};

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(error instanceof Error && error.stack ? error.stack : message);
  process.exitCode = 1;
});
