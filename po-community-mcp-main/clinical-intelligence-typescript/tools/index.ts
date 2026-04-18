import { IMcpTool } from "../IMcpTool";
import { SurfaceHiddenRisksToolInstance } from "./SurfaceHiddenRisksTool";
import { SynthesizeTransitionNarrativeToolInstance } from "./SynthesizeTransitionNarrativeTool";

export const REGISTERED_TOOL_NAMES = [
  "surface_hidden_risks",
  "synthesize_transition_narrative",
] as const;

export const REGISTERED_TOOLS: IMcpTool[] = [
  SurfaceHiddenRisksToolInstance,
  SynthesizeTransitionNarrativeToolInstance,
];
