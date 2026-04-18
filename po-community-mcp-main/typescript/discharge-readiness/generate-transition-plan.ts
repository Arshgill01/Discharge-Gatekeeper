import { GenerateTransitionPlanResponse, ReadinessInput } from "./contract";
import { buildGenerateTransitionPlanResponse } from "./workflow-core";

export const generateTransitionPlan = (
  input: ReadinessInput,
): GenerateTransitionPlanResponse => {
  return buildGenerateTransitionPlanResponse(input);
};
