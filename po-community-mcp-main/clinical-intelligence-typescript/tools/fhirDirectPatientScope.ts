import { Request } from "express";
import { assessDischargeReadinessV1 } from "../../typescript/discharge-readiness/assess-discharge-readiness";
import { BlockerCategory } from "../../typescript/discharge-readiness/contract";
import { resolveWorkflowInputForRequest } from "../../typescript/discharge-readiness/live-context";
import { FhirUtilities } from "../../typescript/fhir-utilities";
import { applyTaskResolutionAndRearbitration, shouldProcessResolutionPrompt } from "../../external-a2a-orchestrator-typescript/fhir/rearbitration";
import { writeAuditArtifacts } from "../../external-a2a-orchestrator-typescript/fhir/audit-writeback";
import { writeDischargeBlockingTasks } from "../../external-a2a-orchestrator-typescript/fhir/task-writeback";
import { reconcileOutputs } from "../../external-a2a-orchestrator-typescript/orchestrator/reconcile";
import { renderBoundedSynthesis } from "../../external-a2a-orchestrator-typescript/orchestrator/synthesis";
import {
  A2ATaskInput,
  DeterministicResponse,
  HiddenRiskResponse,
  ReconciliationResult,
} from "../../external-a2a-orchestrator-typescript/types";
import { HiddenRiskInput } from "../clinical-intelligence/contract";
import { surfaceHiddenRisks } from "../clinical-intelligence/surface-hidden-risks";

const DEFAULT_CARE_TRANSITIONS_PROMPTS = {
  prompt1: "Is this patient safe to discharge today?",
  prompt2: "What hidden risk changed that answer? Show me the contradiction and the evidence.",
  prompt3: "What exactly must happen before discharge, and prepare the transition package.",
} as const;

const isCanonicalBlockerCategory = (value: string): value is BlockerCategory => {
  return [
    "clinical_stability",
    "pending_diagnostics",
    "medication_reconciliation",
    "follow_up_and_referrals",
    "patient_education",
    "home_support_and_services",
    "equipment_and_transport",
    "administrative_and_documentation",
  ].includes(value);
};

const toDeterministicSnapshot = (
  patientId: string | null,
  encounterId: string | null,
  deterministic: DeterministicResponse,
): HiddenRiskInput["deterministic_snapshot"] => ({
  patient_id: patientId,
  encounter_id: encounterId,
  baseline_verdict: deterministic.verdict,
  deterministic_blockers: deterministic.blockers
    .filter((blocker) => isCanonicalBlockerCategory(blocker.category))
    .map((blocker) => ({
      blocker_id: blocker.id,
      category: blocker.category as BlockerCategory,
      description: blocker.description,
      severity:
        blocker.priority === "low" || blocker.priority === "medium"
          ? blocker.priority
          : "high",
    })),
  deterministic_evidence: deterministic.evidence.map((evidence) => ({
    evidence_id: evidence.id,
    source_label: evidence.source_label,
    detail: evidence.detail,
    fhir_reference: evidence.fhir_reference,
    fhir_resource_type: evidence.fhir_resource_type,
    fhir_resource_id: evidence.fhir_resource_id,
    fhir_timestamp: evidence.fhir_timestamp,
  })),
  deterministic_next_steps: deterministic.next_steps.map((step) => step.action),
  deterministic_summary: deterministic.summary,
});

const toTaskInput = (
  req: Request,
  prompt: string,
  explicitTaskGoal: string,
  deterministic: DeterministicResponse,
): A2ATaskInput => ({
  prompt,
  patient_context: {
    patient_id: FhirUtilities.getPatientIdIfContextExists(req),
    encounter_id: FhirUtilities.getEncounterIdIfContextExists(req),
    fhir_context: deterministic.fhir_context?.fhir_server
      ? {
          fhir_server: deterministic.fhir_context.fhir_server,
        }
      : undefined,
    narrative_evidence_bundle: deterministic.fhir_context?.narrative_evidence_bundle,
    optional_context_metadata: {
      ...deterministic.fhir_context?.optional_context_metadata,
      explicit_task_goal: explicitTaskGoal,
    },
  },
});

const buildHiddenRiskInput = (
  req: Request,
  explicitTaskGoal: string,
  deterministic: DeterministicResponse,
): HiddenRiskInput => ({
  deterministic_snapshot: toDeterministicSnapshot(
    FhirUtilities.getPatientIdIfContextExists(req),
    FhirUtilities.getEncounterIdIfContextExists(req),
    deterministic,
  ),
  narrative_evidence_bundle: deterministic.fhir_context?.narrative_evidence_bundle ?? [],
  optional_context_metadata: {
    ...deterministic.fhir_context?.optional_context_metadata,
    explicit_task_goal: explicitTaskGoal,
  },
  fhir_context: deterministic.fhir_context,
});

export type FhirDirectPatientScopeResult = {
  narrative: string;
  prompt_payload: ReconciliationResult["prompt_payload"];
  reconciled: ReconciliationResult;
};

export const canUseLivePatientScope = (req: Request): boolean => {
  return Boolean(
    FhirUtilities.getFhirContext(req) &&
      FhirUtilities.getPatientIdIfContextExists(req),
  );
};

export const requireLivePatientScopeIfConfigured = (
  req: Request,
  toolName: string,
): void => {
  if (process.env["CLINICAL_INTELLIGENCE_REQUIRE_PATIENT_SCOPE"] !== "1") {
    return;
  }
  if (canUseLivePatientScope(req)) {
    return;
  }

  const hasFhirContext = Boolean(FhirUtilities.getFhirContext(req));
  const hasPatientId = Boolean(FhirUtilities.getPatientIdIfContextExists(req));
  throw new Error(
    `${toolName} requires Prompt Opinion Patient Scope FHIR context when ` +
      `CLINICAL_INTELLIGENCE_REQUIRE_PATIENT_SCOPE=1. Missing ` +
      `${hasFhirContext ? "" : "x-fhir-server-url"}${!hasFhirContext && !hasPatientId ? " and " : ""}` +
      `${hasPatientId ? "" : "x-patient-id"}. ` +
      "Refusing canonical fallback to avoid returning a stale or wrong-patient discharge verdict.",
  );
};

export const buildFhirDirectPatientScopeResult = async (
  req: Request,
  options: {
    prompt: string;
    explicitTaskGoal: string;
  },
): Promise<FhirDirectPatientScopeResult | null> => {
  if (!canUseLivePatientScope(req)) {
    return null;
  }

  const resolution = await resolveWorkflowInputForRequest(req, {
    allowSyntheticFallback: false,
    contextMode: "fhir_native",
  });
  const deterministicBase = assessDischargeReadinessV1(resolution.input);
  const deterministic: DeterministicResponse = resolution.fhir_context
    ? {
        ...deterministicBase,
        fhir_context: resolution.fhir_context,
      }
    : (deterministicBase as DeterministicResponse);

  const hiddenRiskInput = buildHiddenRiskInput(
    req,
    options.explicitTaskGoal,
    deterministic,
  );
  const hiddenRisk = await surfaceHiddenRisks(hiddenRiskInput, {
    responseMode: "full",
  });
  const taskInput = toTaskInput(
    req,
    options.prompt,
    options.explicitTaskGoal,
    deterministic,
  );

  const reconciledBase = reconcileOutputs(
    taskInput,
    deterministic,
    hiddenRisk.payload as HiddenRiskResponse,
  );
  const reconciledAfterResolution = await applyTaskResolutionAndRearbitration(
    options.prompt,
    reconciledBase,
  );
  const reconciledWithTasks = shouldProcessResolutionPrompt(options.prompt)
    ? reconciledAfterResolution
    : await writeDischargeBlockingTasks(reconciledAfterResolution);
  const reconciledWithAudit = await writeAuditArtifacts(reconciledWithTasks);
  const synthesis = renderBoundedSynthesis(taskInput, reconciledWithAudit);

  return {
    narrative: synthesis.narrative,
    prompt_payload: synthesis.prompt_payload,
    reconciled: {
      ...reconciledWithAudit,
      prompt_payload: synthesis.prompt_payload,
    },
  };
};

export const DIRECT_PATIENT_SCOPE_PROMPTS = DEFAULT_CARE_TRANSITIONS_PROMPTS;
