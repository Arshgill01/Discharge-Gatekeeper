import { REGISTERED_TOOLS } from "./tools";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { getRuntimeConfig } from "./runtime-config";
import { V1_TOOL_NAME } from "./discharge-readiness/contract";

const config = getRuntimeConfig(process.env as Record<string, string | undefined>);
const startTimeMs = Date.now();

const REGISTERED_TOOL_NAMES = [V1_TOOL_NAME];

const app = createMcpExpressApp({
  host: config.host,
  allowedHosts: config.allowedHosts,
});

const log = (
  level: "info" | "error",
  message: string,
  metadata: Record<string, unknown> = {},
): void => {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...metadata,
  });

  if (level === "error") {
    console.error(line);
    return;
  }

  console.log(line);
};

const formatError = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    return {
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack,
    };
  }

  return { error_message: String(error) };
};

app.use(cors());

const buildHealthPayload = () => {
  return {
    status: "ok",
    server_name: config.serverName,
    server_version: config.serverVersion,
    po_env: config.poEnv,
    tool_count: REGISTERED_TOOL_NAMES.length,
    tools: REGISTERED_TOOL_NAMES,
    allowed_hosts: config.allowedHosts,
    endpoints: {
      mcp: "/mcp",
      healthz: "/healthz",
      readyz: "/readyz",
    },
    uptime_seconds: Math.floor((Date.now() - startTimeMs) / 1000),
  };
};

app.get("/healthz", async (_, res) => {
  res.status(200).json(buildHealthPayload());
});

app.get("/readyz", async (_, res) => {
  res.status(200).json(buildHealthPayload());
});

app.post("/mcp", async (req, res) => {
  const requestId = req.headers["x-request-id"]?.toString() || randomUUID();

  log("info", "MCP request received", {
    request_id: requestId,
    host: req.headers.host || null,
    forwarded_host: req.headers["x-forwarded-host"]?.toString() || null,
    forwarded_proto: req.headers["x-forwarded-proto"]?.toString() || null,
    user_agent: req.headers["user-agent"]?.toString() || null,
    path: req.path,
    method: req.method,
  });

  try {
    const server = new McpServer(
      {
        name: config.serverName,
        version: config.serverVersion,
      },
      {
        capabilities: {
          extensions: {
            "ai.promptopinion/fhir-context": {
              scopes: [
                {
                  name: "patient/Patient.rs",
                  required: true,
                },
                {
                  name: "patient/Observation.rs",
                },
                {
                  name: "patient/MedicationStatement.rs",
                },
                {
                  name: "patient/Condition.rs",
                },
              ],
            },
          },
        },
      },
    );

    for (const tool of REGISTERED_TOOLS) {
      tool.registerTool(server, req);
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      log("info", "MCP request closed", { request_id: requestId });

      transport.close();
      server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    log("error", "MCP request failed", {
      request_id: requestId,
      ...formatError(error),
    });

    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

app.listen(config.port, () => {
  log("info", "MCP server listening", {
    host: config.host,
    port: config.port,
    po_env: config.poEnv,
    allowed_hosts: config.allowedHosts,
    mcp_endpoint: `http://localhost:${config.port}/mcp`,
    health_endpoint: `http://localhost:${config.port}/healthz`,
    readiness_endpoint: `http://localhost:${config.port}/readyz`,
  });
});
