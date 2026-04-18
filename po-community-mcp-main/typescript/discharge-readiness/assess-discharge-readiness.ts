import { AssessDischargeReadinessResponse, ReadinessInput } from "./contract";
import { buildAssessDischargeReadinessResponse } from "./workflow-core";

export const assessDischargeReadinessV1 = (
  input: ReadinessInput,
): AssessDischargeReadinessResponse => {
  return buildAssessDischargeReadinessResponse(input);
};
