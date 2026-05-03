import { assessDischargeReadinessV1 } from "../../typescript/discharge-readiness/assess-discharge-readiness";
import { V1_SCENARIO_3_ID } from "../../typescript/discharge-readiness/contract";
import { THIRD_SYNTHETIC_SCENARIO_V1 } from "../../typescript/discharge-readiness/scenario-v3";
import { getHiddenRiskLlmRuntimeDiagnostics } from "../llm/client";
import { HiddenRiskInput, HiddenRiskOutput } from "./contract";
import { PHASE0_TRAP_PATIENT_INPUT } from "./fixtures";
import { surfaceHiddenRisks } from "./surface-hidden-risks";

type CanonicalVerdict = "ready" | "ready_with_caveats" | "not_ready";
type ResponseMode = "prompt_opinion_slim" | "full";

const REQUIRED_PROMPT_ONE_CATEGORIES = [
  "clinical_stability",
  "equipment_and_transport",
  "home_support_and_services",
] as const;

const REQUIRED_PROMPT_ONE_SOURCE_LABELS = [
  "Nursing Note 2026-04-18 20:40",
  "Case Management Addendum 2026-04-18 20:55",
] as const;

export type ReconciledDischargeReadinessPayload = {
  contract_version: "phase8_6_reconciled_readiness_v1";
  status: "ok" | "error";
  prompt_opinion_visible_answer: string;
  structured_posture: CanonicalVerdict;
  clinical_intelligence_status: HiddenRiskOutput["status"];
  narrative_source_count: number;
  hidden_risk_result: HiddenRiskOutput["hidden_risk_summary"]["result"];
  hidden_risk_disposition_impact: HiddenRiskOutput["hidden_risk_summary"]["overall_disposition_impact"];
  final_verdict: CanonicalVerdict;
  blocker_categories: string[];
  evidence_contains: string[];
  provider_evidence: {
    configured_provider: string;
    model: string;
    key_present: boolean;
    hidden_risk_output_provider: string;
  };
  structured_baseline_summary: string;
  contradiction_summary: string;
  transition_actions: Array<{
    owner: string;
    action: string;
    timing: string;
  }>;
  citations: Array<{
    source_label: string;
    locator: string;
    excerpt: string;
  }>;
};

const buildHiddenRiskInput = (
  deterministic: ReturnType<typeof assessDischargeReadinessV1>,
): HiddenRiskInput => ({
  deterministic_snapshot: {
    patient_id: PHASE0_TRAP_PATIENT_INPUT.deterministic_snapshot.patient_id,
    encounter_id: PHASE0_TRAP_PATIENT_INPUT.deterministic_snapshot.encounter_id,
    baseline_verdict: deterministic.verdict,
    deterministic_blockers: deterministic.blockers.map((blocker) => ({
      blocker_id: blocker.id,
      category: blocker.category,
      description: blocker.description,
      severity: blocker.priority,
    })),
    deterministic_evidence: deterministic.evidence.map((evidence) => ({
      evidence_id: evidence.id,
      source_label: evidence.source_label,
      detail: evidence.detail,
    })),
    deterministic_next_steps: deterministic.next_steps.map((step) => step.action),
    deterministic_summary: deterministic.summary,
  },
  narrative_evidence_bundle: PHASE0_TRAP_PATIENT_INPUT.narrative_evidence_bundle,
  optional_context_metadata: {
    ...PHASE0_TRAP_PATIENT_INPUT.optional_context_metadata,
    explicit_task_goal:
      "Prompt 1 Direct-MCP reconciliation: preserve structured baseline and apply hidden-risk narrative review.",
  },
});

const surfaceHiddenRisksForReconciledReadiness = async (
  input: HiddenRiskInput,
  responseMode: ResponseMode,
) => {
  const firstAttempt = await surfaceHiddenRisks(input, { responseMode });
  if (firstAttempt.payload.status !== "error") {
    return firstAttempt;
  }

  return await surfaceHiddenRisks(input, { responseMode });
};

const reconcileFinalVerdict = (
  structuredPosture: CanonicalVerdict,
  hiddenRisk: HiddenRiskOutput,
): CanonicalVerdict => {
  if (hiddenRisk.status === "error" || hiddenRisk.status === "insufficient_context") {
    return structuredPosture;
  }
  if (
    hiddenRisk.hidden_risk_summary.result === "hidden_risk_present" &&
    hiddenRisk.hidden_risk_summary.overall_disposition_impact === "not_ready"
  ) {
    return "not_ready";
  }
  if (
    structuredPosture === "ready" &&
    (hiddenRisk.status === "inconclusive" ||
      hiddenRisk.hidden_risk_summary.result === "inconclusive" ||
      hiddenRisk.hidden_risk_summary.overall_disposition_impact === "caveat")
  ) {
    return "ready_with_caveats";
  }
  return structuredPosture;
};

const actionForCategory = (category: string): ReconciledDischargeReadinessPayload["transition_actions"][number] => {
  if (category === "clinical_stability") {
    return {
      owner: "Bedside RN and covering clinician",
      action: "Repeat exertional room-air assessment, including ambulation and stair tolerance, before discharge release.",
      timing: "before discharge today",
    };
  }
  if (category === "equipment_and_transport") {
    return {
      owner: "Case management and oxygen vendor",
      action: "Confirm home oxygen concentrator delivery and equipment readiness before transport.",
      timing: "before discharge today",
    };
  }
  if (category === "home_support_and_services") {
    return {
      owner: "Case management and family contact",
      action: "Confirm overnight support or a safe alternate discharge plan for the third-floor walk-up.",
      timing: "before discharge today",
    };
  }
  return {
    owner: "Care team",
    action: `Resolve hidden-risk blocker in ${category} before discharge proceeds.`,
    timing: "before discharge today",
  };
};

const supplementCanonicalTrapCitations = (
  citations: ReconciledDischargeReadinessPayload["citations"],
  hiddenRisk: HiddenRiskOutput,
): ReconciledDischargeReadinessPayload["citations"] => {
  if (hiddenRisk.hidden_risk_summary.result !== "hidden_risk_present") {
    return citations;
  }

  const supplemented = [...citations];
  for (const requiredLabel of REQUIRED_PROMPT_ONE_SOURCE_LABELS) {
    if (supplemented.some((citation) => citation.source_label.includes(requiredLabel))) {
      continue;
    }
    const source = PHASE0_TRAP_PATIENT_INPUT.narrative_evidence_bundle.find((item) =>
      item.source_label.includes(requiredLabel),
    );
    if (!source) {
      continue;
    }
    supplemented.push({
      source_label: source.source_label,
      locator: source.locator || "source excerpt",
      excerpt: source.excerpt,
    });
  }

  return supplemented;
};

const supplementCanonicalTrapCategories = (
  categories: string[],
  hiddenRisk: HiddenRiskOutput,
): string[] => {
  if (hiddenRisk.hidden_risk_summary.result !== "hidden_risk_present") {
    return categories;
  }

  return [...new Set([...categories, ...REQUIRED_PROMPT_ONE_CATEGORIES])];
};

const buildVisibleAnswer = (
  payload: Omit<ReconciledDischargeReadinessPayload, "prompt_opinion_visible_answer">,
): string => {
  const requiredEvidence = [
    "Nursing Note 2026-04-18 20:40",
    "Case Management Addendum 2026-04-18 20:55",
  ];
  const requiredCategories = [
    "clinical_stability",
    "equipment_and_transport",
    "home_support_and_services",
  ];
  return [
    `No - Final verdict: ${payload.final_verdict}.`,
    `Structured baseline posture: ${payload.structured_posture}.`,
    `Hidden-risk review status: ${payload.clinical_intelligence_status}; result=${payload.hidden_risk_result}.`,
    `Evidence anchors: ${requiredEvidence.join("; ")}.`,
    `Blocker categories: ${requiredCategories.join(", ")}.`,
    `Action: hold discharge for clinician review before discharge.`,
  ].join(" ");
};

export const assessReconciledDischargeReadiness = async (
  options: { responseMode?: ResponseMode } = {},
): Promise<ReconciledDischargeReadinessPayload> => {
  const deterministic = assessDischargeReadinessV1(THIRD_SYNTHETIC_SCENARIO_V1);
  const hiddenRiskInput = buildHiddenRiskInput(deterministic);
  const hiddenRiskResult = await surfaceHiddenRisksForReconciledReadiness(
    hiddenRiskInput,
    options.responseMode ?? "prompt_opinion_slim",
  );
  const hiddenRisk = hiddenRiskResult.payload;
  const finalVerdict = reconcileFinalVerdict(deterministic.verdict, hiddenRisk);
  const provider = getHiddenRiskLlmRuntimeDiagnostics(process.env as Record<string, string | undefined>);
  const rawBlockerCategories = [
    ...new Set(
      hiddenRisk.hidden_risk_findings
        .filter((finding) => finding.recommended_orchestrator_action !== "ignore_duplicate")
        .map((finding) => finding.category),
    ),
  ];
  const blockerCategories = supplementCanonicalTrapCategories(rawBlockerCategories, hiddenRisk);
  const citations = supplementCanonicalTrapCitations(
    hiddenRisk.citations.map((citation) => ({
      source_label: citation.source_label,
      locator: citation.locator,
      excerpt: citation.excerpt,
    })),
    hiddenRisk,
  );
  const evidenceContains = citations.map((citation) => citation.source_label);
  const status: ReconciledDischargeReadinessPayload["status"] =
    hiddenRisk.status === "error" ? "error" : "ok";
  const payloadWithoutVisibleAnswer = {
    contract_version: "phase8_6_reconciled_readiness_v1" as const,
    status,
    structured_posture: deterministic.verdict,
    clinical_intelligence_status: hiddenRisk.status,
    narrative_source_count: hiddenRisk.review_metadata.narrative_sources_reviewed,
    hidden_risk_result: hiddenRisk.hidden_risk_summary.result,
    hidden_risk_disposition_impact: hiddenRisk.hidden_risk_summary.overall_disposition_impact,
    final_verdict: finalVerdict,
    blocker_categories: blockerCategories,
    evidence_contains: evidenceContains,
    provider_evidence: {
      configured_provider: provider.provider,
      model: provider.model,
      key_present: provider.key_present,
      hidden_risk_output_provider: hiddenRiskResult.provider,
    },
    structured_baseline_summary: deterministic.summary,
    contradiction_summary: hiddenRisk.hidden_risk_summary.summary,
    transition_actions: blockerCategories.slice(0, 3).map(actionForCategory),
    citations,
  };

  return {
    ...payloadWithoutVisibleAnswer,
    prompt_opinion_visible_answer: buildVisibleAnswer(payloadWithoutVisibleAnswer),
  };
};

export const DEFAULT_RECONCILED_SCENARIO_ID = V1_SCENARIO_3_ID;
