import {
  ReadinessInput,
  SupportedScenarioId,
  V1_PRIMARY_SCENARIO_ID,
  V1_SCENARIO_2_ID,
  V1_SUPPORTED_SCENARIO_IDS,
} from "./contract";
import { FIRST_SYNTHETIC_SCENARIO_V1 } from "./scenario-v1";
import { SECOND_SYNTHETIC_SCENARIO_V1 } from "./scenario-v2";

const SCENARIO_BY_ID: Record<SupportedScenarioId, ReadinessInput> = {
  [V1_PRIMARY_SCENARIO_ID]: FIRST_SYNTHETIC_SCENARIO_V1,
  [V1_SCENARIO_2_ID]: SECOND_SYNTHETIC_SCENARIO_V1,
};

export const DEFAULT_SCENARIO_ID: SupportedScenarioId = V1_PRIMARY_SCENARIO_ID;

export const isSupportedScenarioId = (scenarioId: string): scenarioId is SupportedScenarioId => {
  return (V1_SUPPORTED_SCENARIO_IDS as readonly string[]).includes(scenarioId);
};

export const getScenarioById = (scenarioId: SupportedScenarioId): ReadinessInput => {
  return SCENARIO_BY_ID[scenarioId];
};

export const resolveScenarioInput = (scenarioId?: string): ReadinessInput => {
  if (!scenarioId) {
    return SCENARIO_BY_ID[DEFAULT_SCENARIO_ID];
  }

  if (!isSupportedScenarioId(scenarioId)) {
    throw new Error(
      `Unsupported scenario_id '${scenarioId}'. Supported values: '${V1_SUPPORTED_SCENARIO_IDS.join("', '")}'.`,
    );
  }

  return getScenarioById(scenarioId);
};
