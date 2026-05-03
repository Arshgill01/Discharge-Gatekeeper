import { IMcpTool } from "../IMcpTool";
import { AssessReconciledDischargeReadinessToolInstance } from "./AssessReconciledDischargeReadinessTool";
import { SurfaceHiddenRisksToolInstance } from "./SurfaceHiddenRisksTool";
import { SynthesizeTransitionNarrativeToolInstance } from "./SynthesizeTransitionNarrativeTool";

export const REGISTERED_TOOL_NAMES = [
  "assess_reconciled_discharge_readiness",
  "surface_hidden_risks",
  "synthesize_transition_narrative",
] as const;

export const REGISTERED_TOOLS: IMcpTool[] = [
  AssessReconciledDischargeReadinessToolInstance,
  SurfaceHiddenRisksToolInstance,
  SynthesizeTransitionNarrativeToolInstance,
];
