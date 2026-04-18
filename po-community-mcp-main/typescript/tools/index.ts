import { IMcpTool } from "../IMcpTool";
import { V1_WORKFLOW_TOOL_NAMES } from "../discharge-readiness/contract";
import { AssessDischargeReadinessToolInstance } from "./AssessDischargeReadinessTool";
import { BuildClinicianHandoffBriefToolInstance } from "./BuildClinicianHandoffBriefTool";
import { DraftPatientDischargeInstructionsToolInstance } from "./DraftPatientDischargeInstructionsTool";
import { ExtractDischargeBlockersToolInstance } from "./ExtractDischargeBlockersTool";
import { GenerateTransitionPlanToolInstance } from "./GenerateTransitionPlanTool";

export const REGISTERED_TOOL_NAMES = [...V1_WORKFLOW_TOOL_NAMES];

export const REGISTERED_TOOLS: IMcpTool[] = [
  AssessDischargeReadinessToolInstance,
  ExtractDischargeBlockersToolInstance,
  GenerateTransitionPlanToolInstance,
  BuildClinicianHandoffBriefToolInstance,
  DraftPatientDischargeInstructionsToolInstance,
];
