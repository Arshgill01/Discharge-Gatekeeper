import { RuntimeConfig } from "./runtime-config";

export const buildAgentCard = (config: RuntimeConfig) => {
  return {
    schema_version: "a2a_card_v1",
    name: config.agentName,
    description: "Care Transitions Command - Synchronous external orchestrator",
    version: config.agentVersion,
    supportedInterfaces: [],
    skills: [],
    defaultInputModes: ["text"],
    defaultOutputModes: ["text"],
    agent_identity: {
      name: config.agentName,
      version: config.agentVersion,
      system: "Care Transitions Command",
      role: "Synchronous external orchestrator for Discharge Gatekeeper MCP + Clinical Intelligence MCP",
    },
    capabilities: {
      task_lifecycle: {
        mode: "synchronous",
        streaming: false,
        endpoints: {
          create_task: "/tasks",
          get_task: "/tasks/:taskId",
          list_tasks: "/tasks",
        },
      },
      dependencies: [
        {
          identity: "Discharge Gatekeeper MCP",
          mcp_endpoint: config.dischargeGatekeeperMcpUrl,
          required: true,
        },
        {
          identity: "Clinical Intelligence MCP",
          mcp_endpoint: config.clinicalIntelligenceMcpUrl,
          required: true,
        },
      ],
    },
    safety: {
      autonomous_discharge_authority: false,
      citation_required_for_hidden_risk: true,
      fallback: "If Clinical Intelligence MCP is unavailable, preserve deterministic posture and expose hidden-risk review unavailable status.",
    },
  };
};
