import { IMcpTool } from "../IMcpTool";
import { AssessDischargeReadinessToolInstance } from "./AssessDischargeReadinessTool";
import { ExtractDischargeBlockersToolInstance } from "./ExtractDischargeBlockersTool";
import { GenerateTransitionPlanToolInstance } from "./GenerateTransitionPlanTool";

export const REGISTERED_TOOLS: IMcpTool[] = [
  AssessDischargeReadinessToolInstance,
  ExtractDischargeBlockersToolInstance,
  GenerateTransitionPlanToolInstance,
];
