import { RuntimeConfig } from "./runtime-config";

export const buildAgentCard = (config: RuntimeConfig, publicBaseUrl: string) => {
  const contentModes = ["text/plain", "application/json"];
  const taskEndpoints = {
    create_task: "/tasks",
    get_task: "/tasks/:taskId",
    list_tasks: "/tasks",
  };

  const absoluteTaskEndpoints = {
    create_task: `${publicBaseUrl}/tasks`,
    get_task_template: `${publicBaseUrl}/tasks/:taskId`,
    list_tasks: `${publicBaseUrl}/tasks`,
  };

  return {
    schema_version: "a2a_card_v1",
    protocolVersion: "0.2.6",
    name: config.agentName,
    description: "Care Transitions Command - Synchronous external orchestrator",
    version: config.agentVersion,
    supportedInterfaces: [
      {
        url: publicBaseUrl,
        protocolBinding: "JSONRPC",
        protocolVersion: "0.2.6",
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
        inputModes: contentModes,
        outputModes: contentModes,
      },
    ],
    defaultInputModes: contentModes,
    defaultOutputModes: contentModes,
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
    endpoints: {
      readyz: `${publicBaseUrl}/readyz`,
      healthz: `${publicBaseUrl}/healthz`,
      agent_card: `${publicBaseUrl}/.well-known/agent-card.json`,
      ...absoluteTaskEndpoints,
      createTask: `${publicBaseUrl}/tasks`,
      getTask: `${publicBaseUrl}/tasks/:taskId`,
      listTasks: `${publicBaseUrl}/tasks`,
    },
    task_surface: {
      mode: "synchronous",
      supports_streaming: false,
      accepted_content_types: ["application/json", "application/*+json", "text/plain"],
      response_content_types: ["application/json"],
      accepted_task_shapes: [
        "POST /tasks with {prompt, patient_context?}",
        "POST /tasks with {input: {prompt, patient_context?}}",
        "POST /tasks with {task|task_input|taskInput|request|payload: {prompt|messages, patient_context|patientContext?}}",
        "POST /tasks with text/plain body containing the prompt",
      ],
      response_task_shapes: [
        "completed task record with output + diagnostics",
        "snake_case core fields plus camelCase aliases for task id, request id, and timestamps",
      ],
      request_id_header: "x-request-id",
      request_id_headers: ["x-request-id", "request-id", "x-correlation-id"],
      timeout_ms: config.taskTimeoutMs,
    },
    capabilities: {
      streaming: false,
      pushNotifications: false,
      task_lifecycle: {
        mode: "synchronous",
        streaming: false,
        endpoints: taskEndpoints,
        absolute_endpoints: absoluteTaskEndpoints,
        terminal_states: ["completed", "failed"],
        request_id_headers: ["x-request-id", "request-id", "x-correlation-id"],
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
