import assert from "node:assert/strict";
import { buildReconciledPromptOneToolResult } from "../discharge-readiness/reconciled-prompt-one";

const getText = (result: Awaited<ReturnType<typeof buildReconciledPromptOneToolResult>>): string => {
  const first = result.content[0];
  if (first?.type !== "text") {
    throw new Error("Expected selected direct MCP readiness result to return text content.");
  }

  return first.text;
};

const main = async (): Promise<void> => {
  const result = await buildReconciledPromptOneToolResult("prompt_opinion_slim");
  const visibleAnswer = getText(result);

  assert.equal(result.isError, false);
  assert.ok(
    visibleAnswer.includes("Final verdict: not_ready"),
    "Selected assess_discharge_readiness path must show final not_ready.",
  );
  assert.ok(
    visibleAnswer.includes("Structured baseline posture: ready"),
    "Selected assess_discharge_readiness path must preserve structured baseline ready.",
  );
  assert.ok(
    visibleAnswer.includes("Hidden-risk review status: ok"),
    "Selected assess_discharge_readiness path must show hidden-risk review ok.",
  );

  for (const source of [
    "Nursing Note 2026-04-18 20:40",
    "Case Management Addendum 2026-04-18 20:55",
  ]) {
    assert.ok(
      visibleAnswer.includes(source),
      `Selected assess_discharge_readiness path missing evidence anchor ${source}.`,
    );
  }

  for (const category of [
    "clinical_stability",
    "equipment_and_transport",
    "home_support_and_services",
  ]) {
    assert.ok(
      visibleAnswer.includes(category),
      `Selected assess_discharge_readiness path missing blocker category ${category}.`,
    );
  }

  assert.ok(
    visibleAnswer.split(/\s+/).length <= 900,
    "Selected assess_discharge_readiness visible answer must stay under 900 words.",
  );

  console.log("SMOKE PASS: selected direct MCP reconciled readiness");
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
