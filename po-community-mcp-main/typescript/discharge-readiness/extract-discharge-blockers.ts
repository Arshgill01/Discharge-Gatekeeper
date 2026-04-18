import { ExtractDischargeBlockersResponse, ReadinessInput } from "./contract";
import { buildExtractDischargeBlockersResponse } from "./workflow-core";

export const extractDischargeBlockers = (
  input: ReadinessInput,
): ExtractDischargeBlockersResponse => {
  return buildExtractDischargeBlockersResponse(input);
};
