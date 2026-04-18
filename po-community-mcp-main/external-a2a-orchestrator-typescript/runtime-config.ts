type Environment = Record<string, string | undefined>;

const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 5057;
const SUPPORTED_PO_ENVS = new Set(["local", "dev", "prod"]);
const DEFAULT_TASK_TIMEOUT_MS = 12000;

const normalizeHostEntry = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error("ALLOWED_HOSTS includes an empty host entry.");
  }

  if (trimmed.includes("://")) {
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new Error(`Invalid ALLOWED_HOSTS entry '${value}'.`);
    }
    if (!parsed.hostname) {
      throw new Error(`Invalid ALLOWED_HOSTS entry '${value}': missing hostname.`);
    }
    return parsed.hostname.toLowerCase();
  }

  let normalized = trimmed.toLowerCase();
  const slashIndex = normalized.indexOf("/");
  if (slashIndex >= 0) {
    normalized = normalized.slice(0, slashIndex);
  }

  if (!normalized.startsWith("[") && normalized.includes(":")) {
    const segments = normalized.split(":");
    const hostOnly = segments[0];
    if (segments.length === 2 && hostOnly) {
      normalized = hostOnly;
    }
  }

  if (normalized.length === 0) {
    throw new Error(`Invalid ALLOWED_HOSTS entry '${value}': missing hostname.`);
  }

  return normalized;
};

const parseCsvHosts = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((host) => host.trim())
    .filter((host) => host.length > 0)
    .map((host) => normalizeHostEntry(host));
};

const parsePoEnv = (value: string | undefined): string => {
  const poEnv = value?.trim().toLowerCase() || "local";
  if (!SUPPORTED_PO_ENVS.has(poEnv)) {
    throw new Error(`Invalid PO_ENV value '${value}'. Supported values: local, dev, prod.`);
  }
  return poEnv;
};

const parsePort = (value: string | undefined): number => {
  if (!value) {
    return DEFAULT_PORT;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid PORT value '${value}'. Expected an integer between 1 and 65535.`);
  }

  return parsed;
};

const parseTaskTimeoutMs = (value: string | undefined): number => {
  if (!value) {
    return DEFAULT_TASK_TIMEOUT_MS;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1000 || parsed > 120000) {
    throw new Error(`Invalid A2A_TASK_TIMEOUT_MS value '${value}'. Expected an integer between 1000 and 120000.`);
  }

  return parsed;
};

const defaultAllowedHostsByPoEnv = (poEnv: string): string[] => {
  switch (poEnv) {
    case "dev":
      return ["localhost", "127.0.0.1"];
    case "prod":
      return ["localhost", "127.0.0.1"];
    default:
      return ["localhost", "127.0.0.1"];
  }
};

export type RuntimeConfig = {
  host: string;
  port: number;
  poEnv: string;
  allowedHosts: string[];
  agentName: string;
  agentVersion: string;
  dischargeGatekeeperMcpUrl: string;
  clinicalIntelligenceMcpUrl: string;
  defaultStructuredScenarioId: string;
  taskTimeoutMs: number;
};

export const getRuntimeConfig = (environment: Environment): RuntimeConfig => {
  const poEnv = parsePoEnv(environment["PO_ENV"]);
  const explicitAllowedHosts = parseCsvHosts(environment["ALLOWED_HOSTS"]);
  const allowedHosts = [
    ...new Set([...defaultAllowedHostsByPoEnv(poEnv), ...explicitAllowedHosts]),
  ];

  const dischargeGatekeeperMcpUrl = environment["DISCHARGE_GATEKEEPER_MCP_URL"]?.trim() || "http://127.0.0.1:5055/mcp";
  const clinicalIntelligenceMcpUrl = environment["CLINICAL_INTELLIGENCE_MCP_URL"]?.trim() || "http://127.0.0.1:5056/mcp";

  return {
    host: environment["HOST"]?.trim() || DEFAULT_HOST,
    port: parsePort(environment["PORT"]),
    poEnv,
    allowedHosts,
    agentName: environment["A2A_AGENT_NAME"]?.trim() || "external A2A orchestrator",
    agentVersion: environment["A2A_AGENT_VERSION"]?.trim() || "1.0.0",
    dischargeGatekeeperMcpUrl,
    clinicalIntelligenceMcpUrl,
    defaultStructuredScenarioId:
      environment["DEFAULT_STRUCTURED_SCENARIO_ID"]?.trim() || "third_synthetic_discharge_slice_ready_v1",
    taskTimeoutMs: parseTaskTimeoutMs(environment["A2A_TASK_TIMEOUT_MS"]),
  };
};
