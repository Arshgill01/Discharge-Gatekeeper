import assert from "node:assert/strict";
import { HiddenRiskLlmClient } from "../llm/client";
import { HIDDEN_RISK_SYSTEM_PROMPT } from "../clinical-intelligence/prompt-contract";
import { surfaceHiddenRisks } from "../clinical-intelligence/surface-hidden-risks";
import {
  ALTERNATIVE_HIDDEN_RISK_INPUT,
  DUPLICATE_SIGNAL_CONTROL_INPUT,
  INCONCLUSIVE_CONTEXT_INPUT,
  MARIA_ALVAREZ_ABLATION_INPUT,
  NO_RISK_CONTROL_INPUT,
  PHASE0_TRAP_PATIENT_INPUT,
} from "../clinical-intelligence/fixtures";
import {
  ABLATION_HIDDEN_RISK_EXPECTED_MATRIX,
  ALTERNATIVE_HIDDEN_RISK_EXPECTED_MATRIX,
  CONTROL_HIDDEN_RISK_EXPECTED_MATRIX,
  DUPLICATE_SIGNAL_EXPECTED_MATRIX,
  INCONCLUSIVE_CONTEXT_EXPECTED_MATRIX,
  TRAP_HIDDEN_RISK_EXPECTED_MATRIX,
} from "../clinical-intelligence/expected-output-matrix";

const assertFindingCitationQuality = async (): Promise<void> => {
  const result = await surfaceHiddenRisks(PHASE0_TRAP_PATIENT_INPUT);
  const payload = result.payload;

  for (const finding of payload.hidden_risk_findings) {
    assert.ok(
      finding.citation_ids.length >= TRAP_HIDDEN_RISK_EXPECTED_MATRIX.minimum_citations_per_finding,
      `Finding ${finding.finding_id} must include at least ${TRAP_HIDDEN_RISK_EXPECTED_MATRIX.minimum_citations_per_finding} citation(s).`,
    );

    for (const citationId of finding.citation_ids) {
      const citation = payload.citations.find((item) => item.citation_id === citationId);
      assert.ok(citation, `Finding ${finding.finding_id} references unknown citation ${citationId}.`);
      assert.ok(
        citation && citation.locator.trim().length > 0,
        `Citation ${citationId} must include a non-empty locator.`,
      );
      assert.ok(
        citation && citation.excerpt.trim().length >= 20,
        `Citation ${citationId} must include a meaningful excerpt.`,
      );
    }
  }
};

const assertTrapPatientBehavior = async (): Promise<void> => {
  const result = await surfaceHiddenRisks(PHASE0_TRAP_PATIENT_INPUT);
  const payload = result.payload;

  assert.equal(payload.contract_version, "phase0_hidden_risk_v1");
  assert.equal(payload.status, TRAP_HIDDEN_RISK_EXPECTED_MATRIX.expected_status);
  assert.equal(
    payload.hidden_risk_summary.result === "hidden_risk_present",
    TRAP_HIDDEN_RISK_EXPECTED_MATRIX.should_find_hidden_risk,
  );
  assert.equal(
    payload.hidden_risk_summary.overall_disposition_impact,
    TRAP_HIDDEN_RISK_EXPECTED_MATRIX.expected_disposition_impact,
  );
  assert.equal(payload.hidden_risk_findings.length > 0, true);
  assert.ok(
    payload.hidden_risk_summary.summary.includes("Structured baseline was ready"),
    "Trap hidden-risk summary must preserve the structured baseline posture.",
  );
  assert.ok(
    payload.hidden_risk_summary.summary.includes("Nursing Note 2026-04-18 20:40"),
    "Trap hidden-risk summary must anchor the contradiction to the nursing note.",
  );

  const categories = new Set(payload.hidden_risk_findings.map((finding) => finding.category));
  for (const category of TRAP_HIDDEN_RISK_EXPECTED_MATRIX.expected_categories) {
    assert.ok(categories.has(category), `Expected trap category '${category}' to be present.`);
  }

  const citedSourceLabels = new Set(payload.citations.map((citation) => citation.source_label));
  for (const expectedSource of TRAP_HIDDEN_RISK_EXPECTED_MATRIX.required_citation_source_labels) {
    assert.ok(
      [...citedSourceLabels].some((label) => label.includes(expectedSource)),
      `Expected hidden-risk output to cite or reference '${expectedSource}'.`,
    );
  }

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

  assert.equal(payload.status, CONTROL_HIDDEN_RISK_EXPECTED_MATRIX.expected_status);
  assert.equal(payload.hidden_risk_summary.result, "no_hidden_risk");
  assert.equal(
    payload.hidden_risk_summary.overall_disposition_impact,
    CONTROL_HIDDEN_RISK_EXPECTED_MATRIX.expected_disposition_impact,
  );
  assert.equal(
    payload.hidden_risk_findings.length === 0,
    CONTROL_HIDDEN_RISK_EXPECTED_MATRIX.no_risk_behavior.findings_must_be_empty,
  );
  assert.equal(
    payload.hidden_risk_summary.manual_review_required,
    CONTROL_HIDDEN_RISK_EXPECTED_MATRIX.no_risk_behavior.manual_review_required,
  );
  assert.ok(
    payload.hidden_risk_summary.summary
      .toLowerCase()
      .includes(CONTROL_HIDDEN_RISK_EXPECTED_MATRIX.no_risk_behavior.summary_must_contain.toLowerCase()),
    "No-risk response must be explicit, not generic escalation.",
  );
  assert.ok(
    payload.hidden_risk_summary.summary.includes("Structured baseline remains ready"),
    "No-risk response should preserve the unchanged baseline posture.",
  );
};

const assertAblationBehavior = async (): Promise<void> => {
  const result = await surfaceHiddenRisks(MARIA_ALVAREZ_ABLATION_INPUT);
  const payload = result.payload;

  assert.equal(payload.status, ABLATION_HIDDEN_RISK_EXPECTED_MATRIX.expected_status);
  assert.equal(payload.hidden_risk_summary.result, "no_hidden_risk");
  assert.equal(
    payload.hidden_risk_summary.overall_disposition_impact,
    ABLATION_HIDDEN_RISK_EXPECTED_MATRIX.expected_disposition_impact,
  );
  assert.equal(payload.hidden_risk_findings.length, 0);
  assert.equal(payload.citations.length, 0);
};

const assertDuplicateSignalSuppressionBehavior = async (): Promise<void> => {
  const result = await surfaceHiddenRisks(DUPLICATE_SIGNAL_CONTROL_INPUT);
  const payload = result.payload;

  assert.equal(payload.status, DUPLICATE_SIGNAL_EXPECTED_MATRIX.expected_status);
  assert.equal(payload.hidden_risk_summary.result, "no_hidden_risk");
  assert.equal(payload.hidden_risk_findings.length, 0);
  assert.equal(payload.citations.length, 0);
  assert.ok(
    payload.review_metadata.duplicate_findings_suppressed >=
      DUPLICATE_SIGNAL_EXPECTED_MATRIX.minimum_duplicate_findings_suppressed,
    "Duplicate-signal control must suppress at least one finding that repeats deterministic blockers.",
  );
};

const assertAlternativeHiddenRiskBehavior = async (): Promise<void> => {
  const result = await surfaceHiddenRisks(ALTERNATIVE_HIDDEN_RISK_INPUT);
  const payload = result.payload;

  assert.equal(payload.status, ALTERNATIVE_HIDDEN_RISK_EXPECTED_MATRIX.expected_status);
  assert.equal(payload.hidden_risk_summary.result, "hidden_risk_present");
  assert.equal(
    payload.hidden_risk_summary.overall_disposition_impact,
    ALTERNATIVE_HIDDEN_RISK_EXPECTED_MATRIX.expected_disposition_impact,
  );

  const categories = new Set(payload.hidden_risk_findings.map((finding) => finding.category));
  assert.equal(categories.size, 1);
  for (const category of ALTERNATIVE_HIDDEN_RISK_EXPECTED_MATRIX.expected_categories) {
    assert.ok(categories.has(category), `Alternative hidden-risk case missing category ${category}.`);
  }

  const sourceLabels = payload.citations.map((citation) => citation.source_label);
  for (const expectedSource of ALTERNATIVE_HIDDEN_RISK_EXPECTED_MATRIX.required_citation_source_labels) {
    assert.ok(
      sourceLabels.some((label) => label.includes(expectedSource)),
      `Alternative hidden-risk case must cite ${expectedSource}.`,
    );
  }
};

const assertInconclusiveContextBehavior = async (): Promise<void> => {
  const result = await surfaceHiddenRisks(INCONCLUSIVE_CONTEXT_INPUT);
  const payload = result.payload;

  assert.equal(payload.status, INCONCLUSIVE_CONTEXT_EXPECTED_MATRIX.expected_status);
  assert.equal(payload.hidden_risk_summary.result, "inconclusive");
  assert.equal(
    payload.hidden_risk_summary.overall_disposition_impact,
    INCONCLUSIVE_CONTEXT_EXPECTED_MATRIX.expected_disposition_impact,
  );
  assert.equal(payload.hidden_risk_summary.manual_review_required, true);
  assert.equal(payload.hidden_risk_findings.length, 0);
  assert.equal(payload.citations.length, 0);
  assert.ok(
    payload.hidden_risk_summary.summary.includes("Manual review"),
    "Insufficient-context behavior must explicitly require manual review.",
  );
};

const assertMalformedModelOutputBecomesStructuredError = async (): Promise<void> => {
  const malformedClient: HiddenRiskLlmClient = {
    generateHiddenRiskResponse: async () => ({
      provider: "heuristic",
      rawText: "not json",
    }),
  };

  const result = await surfaceHiddenRisks(PHASE0_TRAP_PATIENT_INPUT, {
    llmClientOverride: malformedClient,
  });
  const payload = result.payload;

  assert.equal(payload.status, "error");
  assert.equal(payload.hidden_risk_summary.result, "inconclusive");
  assert.equal(payload.hidden_risk_summary.manual_review_required, true);
  assert.equal(payload.hidden_risk_findings.length, 0);
};

const assertCitationFailuresAreSuppressed = async (): Promise<void> => {
  const uncitedRiskClient: HiddenRiskLlmClient = {
    generateHiddenRiskResponse: async () => ({
      provider: "heuristic",
      rawText: JSON.stringify({
        contract_version: "phase0_hidden_risk_v1",
        status: "ok",
        patient_id: "phase0-test",
        encounter_id: "enc-phase0-test",
        baseline_verdict: "ready",
        hidden_risk_summary: {
          result: "hidden_risk_present",
          overall_disposition_impact: "not_ready",
          confidence: "medium",
          summary: "Test payload intentionally omits valid citations.",
          manual_review_required: false,
          false_positive_guardrail: "test",
        },
        hidden_risk_findings: [
          {
            finding_id: "hr_001",
            title: "Uncited finding should be suppressed",
            category: "clinical_stability",
            disposition_impact: "not_ready",
            confidence: "medium",
            is_duplicate_of_blocker_id: null,
            rationale: "Uncited contradiction.",
            recommended_orchestrator_action: "add_blocker",
            citation_ids: ["cit_missing"],
          },
        ],
        citations: [],
        review_metadata: {
          narrative_sources_reviewed: 1,
          duplicate_findings_suppressed: 0,
          weak_findings_suppressed: 0,
        },
      }),
    }),
  };

  const result = await surfaceHiddenRisks(PHASE0_TRAP_PATIENT_INPUT, {
    llmClientOverride: uncitedRiskClient,
  });
  const payload = result.payload;

  assert.equal(payload.status, "ok");
  assert.equal(payload.hidden_risk_summary.result, "no_hidden_risk");
  assert.equal(payload.hidden_risk_findings.length, 0);
  assert.equal(payload.review_metadata.weak_findings_suppressed > 0, true);
};

const assertDuplicateFindingsAreSuppressedAgainstDeterministicBlockers = async (): Promise<void> => {
  const duplicateClient: HiddenRiskLlmClient = {
    generateHiddenRiskResponse: async () => ({
      provider: "heuristic",
      rawText: JSON.stringify({
        contract_version: "phase0_hidden_risk_v1",
        status: "ok",
        patient_id: "phase0-test",
        encounter_id: "enc-phase0-test",
        baseline_verdict: "ready",
        hidden_risk_summary: {
          result: "hidden_risk_present",
          overall_disposition_impact: "not_ready",
          confidence: "medium",
          summary: "Duplicate should be filtered.",
          manual_review_required: false,
          false_positive_guardrail: "test",
        },
        hidden_risk_findings: [
          {
            finding_id: "hr_dup",
            title: "Overnight oxygen setup still unconfirmed",
            category: "equipment_and_transport",
            disposition_impact: "not_ready",
            confidence: "medium",
            is_duplicate_of_blocker_id: "det_blocker_001",
            rationale: "Home oxygen concentrator unavailable tonight and logistics incomplete.",
            recommended_orchestrator_action: "add_blocker",
            citation_ids: ["cit_001"],
          },
        ],
        citations: [
          {
            citation_id: "cit_001",
            source_type: "case_management_note",
            source_label: "Case Management Note",
            locator: "line 1",
            excerpt: "Home oxygen concentrator unavailable tonight.",
          },
        ],
        review_metadata: {
          narrative_sources_reviewed: 1,
          duplicate_findings_suppressed: 0,
          weak_findings_suppressed: 0,
        },
      }),
    }),
  };

  const result = await surfaceHiddenRisks(
    {
      ...PHASE0_TRAP_PATIENT_INPUT,
      deterministic_snapshot: {
        ...PHASE0_TRAP_PATIENT_INPUT.deterministic_snapshot,
        deterministic_blockers: [
          {
            blocker_id: "det_blocker_001",
            category: "equipment_and_transport",
            description: "Home oxygen concentrator unavailable tonight; discharge transport not safe.",
            severity: "high",
          },
        ],
      },
    },
    {
      llmClientOverride: duplicateClient,
    },
  );

  const payload = result.payload;
  assert.equal(payload.status, "ok");
  assert.equal(payload.hidden_risk_summary.result, "no_hidden_risk");
  assert.equal(payload.hidden_risk_findings.length, 0);
  assert.equal(payload.review_metadata.duplicate_findings_suppressed > 0, true);
};

const assertLowConfidenceEscalationIsDowngradedToInconclusive = async (): Promise<void> => {
  const lowConfidenceClient: HiddenRiskLlmClient = {
    generateHiddenRiskResponse: async () => ({
      provider: "heuristic",
      rawText: JSON.stringify({
        contract_version: "phase0_hidden_risk_v1",
        status: "ok",
        patient_id: "phase0-test",
        encounter_id: "enc-phase0-test",
        baseline_verdict: "ready",
        hidden_risk_summary: {
          result: "hidden_risk_present",
          overall_disposition_impact: "not_ready",
          confidence: "low",
          summary: "Single weak source claimed escalation.",
          manual_review_required: false,
          false_positive_guardrail: "test",
        },
        hidden_risk_findings: [
          {
            finding_id: "hr_weak",
            title: "Possible overnight risk",
            category: "home_support_and_services",
            disposition_impact: "not_ready",
            confidence: "low",
            is_duplicate_of_blocker_id: null,
            rationale: "Support status unclear.",
            recommended_orchestrator_action: "add_blocker",
            citation_ids: ["cit_weak_001"],
          },
        ],
        citations: [
          {
            citation_id: "cit_weak_001",
            source_type: "case_management_note",
            source_label: "Case Management Note",
            locator: "line 2",
            excerpt: "Overnight support status remains uncertain and requires follow-up.",
          },
        ],
        review_metadata: {
          narrative_sources_reviewed: 1,
          duplicate_findings_suppressed: 0,
          weak_findings_suppressed: 0,
        },
      }),
    }),
  };

  const result = await surfaceHiddenRisks(PHASE0_TRAP_PATIENT_INPUT, {
    llmClientOverride: lowConfidenceClient,
  });
  const payload = result.payload;
  assert.equal(payload.status, "inconclusive");
  assert.equal(payload.hidden_risk_summary.result, "inconclusive");
  assert.equal(payload.hidden_risk_summary.manual_review_required, true);
  assert.equal(payload.hidden_risk_findings.length, 1);
  assert.equal(payload.hidden_risk_findings[0]?.disposition_impact, "uncertain");
  assert.equal(payload.hidden_risk_findings[0]?.recommended_orchestrator_action, "request_manual_review");
};

const assertPromptContractGuardrailsPresent = (): void => {
  const requiredPhrases = [
    "Review only the evidence provided",
    "Suppress duplicates",
    "uncited claims",
    "Return only the JSON schema",
    "contradiction across multiple notes",
  ];
  for (const phrase of requiredPhrases) {
    assert.ok(
      HIDDEN_RISK_SYSTEM_PROMPT.includes(phrase),
      `Prompt contract drift: missing phrase '${phrase}'.`,
    );
  }
};

const main = async (): Promise<void> => {
  assertPromptContractGuardrailsPresent();
  await assertTrapPatientBehavior();
  await assertFindingCitationQuality();
  await assertControlNoRiskBehavior();
  await assertAblationBehavior();
  await assertDuplicateSignalSuppressionBehavior();
  await assertAlternativeHiddenRiskBehavior();
  await assertInconclusiveContextBehavior();
  await assertMalformedModelOutputBecomesStructuredError();
  await assertCitationFailuresAreSuppressed();
  await assertDuplicateFindingsAreSuppressedAgainstDeterministicBlockers();
  await assertLowConfidenceEscalationIsDowngradedToInconclusive();
  console.log("SMOKE PASS: hidden-risk detection");
};

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
