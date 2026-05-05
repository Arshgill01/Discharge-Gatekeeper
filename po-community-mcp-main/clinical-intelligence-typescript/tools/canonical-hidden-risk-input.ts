import { V1_SCENARIO_3_ID } from "../../typescript/discharge-readiness/contract";
import {
  HiddenRiskInput,
  hiddenRiskInputSchema,
} from "../clinical-intelligence/contract";
import { PHASE0_TRAP_PATIENT_INPUT } from "../clinical-intelligence/fixtures";

export const DEFAULT_HIDDEN_RISK_SCENARIO_ID = V1_SCENARIO_3_ID;

type HiddenRiskToolInput = {
  scenario_id?: string;
  deterministic_snapshot?: unknown;
  narrative_evidence_bundle?: unknown;
  optional_context_metadata?: HiddenRiskInput["optional_context_metadata"];
};

export const resolveHiddenRiskToolInput = (
  input: HiddenRiskToolInput,
  explicitTaskGoal: string,
): HiddenRiskInput => {
  if (!input.deterministic_snapshot) {
    if (!input.scenario_id || input.scenario_id === DEFAULT_HIDDEN_RISK_SCENARIO_ID) {
      return {
        deterministic_snapshot: PHASE0_TRAP_PATIENT_INPUT.deterministic_snapshot,
        narrative_evidence_bundle: PHASE0_TRAP_PATIENT_INPUT.narrative_evidence_bundle,
        optional_context_metadata: {
          ...PHASE0_TRAP_PATIENT_INPUT.optional_context_metadata,
          explicit_task_goal: explicitTaskGoal,
        },
      };
    }

    throw new Error(
      `Unsupported scenario_id '${input.scenario_id}'. Supported value: '${DEFAULT_HIDDEN_RISK_SCENARIO_ID}'.`,
    );
  }

  return hiddenRiskInputSchema.parse({
    deterministic_snapshot: input.deterministic_snapshot,
    narrative_evidence_bundle: input.narrative_evidence_bundle ?? [],
    optional_context_metadata: input.optional_context_metadata,
  });
};
