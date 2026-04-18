import assert from "node:assert/strict";
import { applyDecisionMatrix } from "../orchestrator/decision-matrix";

const run = (): void => {
  const readyNoRisk = applyDecisionMatrix("ready", "no_hidden_risk", "none");
  assert.equal(readyNoRisk.row, 1);
  assert.equal(readyNoRisk.finalVerdict, "ready");

  const readyHiddenRisk = applyDecisionMatrix("ready", "hidden_risk_present", "not_ready");
  assert.equal(readyHiddenRisk.row, 3);
  assert.equal(readyHiddenRisk.finalVerdict, "not_ready");

  const caveatNoRisk = applyDecisionMatrix("ready_with_caveats", "no_hidden_risk", "none");
  assert.equal(caveatNoRisk.row, 4);
  assert.equal(caveatNoRisk.finalVerdict, "ready_with_caveats");

  const caveatHiddenRisk = applyDecisionMatrix(
    "ready_with_caveats",
    "hidden_risk_present",
    "not_ready",
  );
  assert.equal(caveatHiddenRisk.row, 6);
  assert.equal(caveatHiddenRisk.finalVerdict, "not_ready");

  const notReadyNoRisk = applyDecisionMatrix("not_ready", "no_hidden_risk", "none");
  assert.equal(notReadyNoRisk.row, 7);
  assert.equal(notReadyNoRisk.finalVerdict, "not_ready");

  const notReadyHiddenRisk = applyDecisionMatrix("not_ready", "hidden_risk_present", "caveat");
  assert.equal(notReadyHiddenRisk.row, 8);
  assert.equal(notReadyHiddenRisk.finalVerdict, "not_ready");

  const inconclusive = applyDecisionMatrix("ready", "inconclusive", "uncertain");
  assert.equal(inconclusive.row, 10);
  assert.equal(inconclusive.finalVerdict, "ready_with_caveats");
  assert.equal(inconclusive.manualReviewRequired, true);

  console.log("PASS decision matrix smoke");
};

run();
