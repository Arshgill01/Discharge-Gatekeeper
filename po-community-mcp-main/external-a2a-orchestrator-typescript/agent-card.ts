import { RuntimeConfig } from "./runtime-config";

export const buildAgentCard = (config: RuntimeConfig, publicBaseUrl: string) => {
  return {
    schema_version: "a2a_card_v1",
    protocolVersion: "0.2.6",
    name: config.agentName,
    description: "Care Transitions Command - Synchronous external orchestrator",
    version: config.agentVersion,
    url: publicBaseUrl,
    preferredTransport: "JSONRPC",
    supportedInterfaces: [
      {
        url: publicBaseUrl,
        protocolBinding: "JSONRPC",
        protocolVersion: "0.2.6",
      },
    ],
    additionalInterfaces: [
      {
        url: publicBaseUrl,
        transport: "JSONRPC",
      },
    ],
    skills: [
      {
        id: "care-transitions-command",
        name: "Care Transitions Command",
        description:
          "Coordinates discharge safety review, hidden-risk contradiction analysis, and transition package generation.",
        tags: [
          "care-transitions",
          "discharge",
          "clinical-intelligence",
          "orchestration",
        ],
        examples: [
          "Is this patient safe to discharge today?",
          "What hidden risk changed that answer? Show me the contradiction and the evidence.",
          "What exactly must happen before discharge, and prepare the transition package.",
        ],
        inputModes: ["text/plain"],
        outputModes: ["text/plain"],
      },
    ],
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["text/plain"],
    supportsAuthenticatedExtendedCard: false,
    provider: {
      organization: "Care Transitions Command",
      url: publicBaseUrl,
    },
    agent_identity: {
      name: config.agentName,
      version: config.agentVersion,
      system: "Care Transitions Command",
      role: "Synchronous external orchestrator for Discharge Gatekeeper MCP + Clinical Intelligence MCP",
    },
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false,
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
