type Environment = Record<string, string | undefined>;

const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 5055;
const SUPPORTED_PO_ENVS = new Set(["local", "dev", "prod"]);

const normalizeHostEntry = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error("ALLOWED_HOSTS includes an empty host entry.");
  }

  // Accept full URLs for convenience and normalize to host.
  if (trimmed.includes("://")) {
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new Error(
        `Invalid ALLOWED_HOSTS entry '${value}'. Use a hostname like 'example.com' or a full URL like 'https://example.com'.`,
      );
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

  // Normalize host:port entries to host only.
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

const parsePort = (value: string | undefined): number => {
  if (!value) {
    return DEFAULT_PORT;
  }

  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value '${value}'. Expected an integer between 1 and 65535.`);
  }

  return port;
};

const parsePoEnv = (value: string | undefined): string => {
  const poEnv = value?.trim().toLowerCase() || "local";
  if (!SUPPORTED_PO_ENVS.has(poEnv)) {
    throw new Error(
      `Invalid PO_ENV value '${value}'. Supported values are: local, dev, prod.`,
    );
  }

  return poEnv;
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
  const poEnv = parsePoEnv(environment["PO_ENV"]);
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
