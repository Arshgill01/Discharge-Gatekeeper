type Environment = Record<string, string | undefined>;

const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 5000;

const parseCsvHosts = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((host) => host.trim())
    .filter((host) => host.length > 0);
};

const parsePort = (value: string | undefined): number => {
  if (!value) {
    return DEFAULT_PORT;
  }

  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT value '${value}'. Expected a positive integer.`);
  }

  return port;
};

const defaultAllowedHostsByPoEnv = (poEnv: string): string[] => {
  switch (poEnv) {
    case "dev":
      return ["ts.fhir-mcp.dev.promptopinion.ai", "localhost", "127.0.0.1"];
    case "prod":
      return ["ts.fhir-mcp.promptopinion.ai", "localhost", "127.0.0.1"];
    default:
      return ["localhost", "127.0.0.1"];
  }
};

export type RuntimeConfig = {
  host: string;
  port: number;
  poEnv: string;
  allowedHosts: string[];
  serverName: string;
  serverVersion: string;
};

export const getRuntimeConfig = (environment: Environment): RuntimeConfig => {
  const poEnv = environment["PO_ENV"]?.trim() || "local";
  const explicitAllowedHosts = parseCsvHosts(environment["ALLOWED_HOSTS"]);
  const allowedHosts = [
    ...new Set([
      ...defaultAllowedHostsByPoEnv(poEnv),
      ...explicitAllowedHosts,
    ]),
  ];

  return {
    host: environment["HOST"]?.trim() || DEFAULT_HOST,
    port: parsePort(environment["PORT"]),
    poEnv,
    allowedHosts,
    serverName: environment["MCP_SERVER_NAME"]?.trim() || "Discharge Gatekeeper MCP",
    serverVersion: environment["MCP_SERVER_VERSION"]?.trim() || "1.0.0",
  };
};
