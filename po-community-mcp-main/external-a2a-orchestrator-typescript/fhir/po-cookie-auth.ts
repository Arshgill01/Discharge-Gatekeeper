import { spawnSync } from "node:child_process";
import path from "node:path";

const COOKIE_AUTH_FHIR_REQUEST_SCRIPT = path.resolve(
  __dirname,
  "..",
  "..",
  "scripts",
  "po-cookie-auth-fhir-request.mjs",
);

type BrowserCookieOperation = {
  method: "GET" | "POST" | "PUT";
  url: string;
  body?: Record<string, unknown>;
};

type BrowserCookieOperationResult = {
  method: string;
  url: string;
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  text: string;
};

const getWorkspaceFhirUrl = (): string => {
  const workspaceFhirUrl = process.env["PO_WORKSPACE_FHIR_URL"]?.trim();
  if (!workspaceFhirUrl) {
    throw new Error("PO_WORKSPACE_FHIR_URL is required for Prompt Opinion browser-auth FHIR access.");
  }

  return workspaceFhirUrl;
};

export const isPromptOpinionBrowserAuthEnabled = (): boolean =>
  Boolean(process.env["PO_WORKSPACE_FHIR_URL"]?.trim());

export const runPromptOpinionBrowserFhirOperations = (
  operations: BrowserCookieOperation[],
): BrowserCookieOperationResult[] => {
  if (operations.length === 0) {
    return [];
  }

  const child = spawnSync(
    "npx",
    ["--yes", "--package", "playwright", "node", COOKIE_AUTH_FHIR_REQUEST_SCRIPT],
    {
      env: {
        ...process.env,
        PO_WORKSPACE_FHIR_URL: getWorkspaceFhirUrl(),
        PO_FHIR_OPERATIONS_JSON: JSON.stringify(operations),
      },
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  if (child.status !== 0) {
    throw new Error(
      `[po-cookie-auth-fhir] ${child.stderr || child.stdout || `helper exited ${child.status}`}`,
    );
  }

  return JSON.parse(child.stdout || "[]") as BrowserCookieOperationResult[];
};

export const createResourcesViaPromptOpinionBrowserAuth = (
  resources: Record<string, unknown>[],
): Record<string, unknown>[] => {
  const baseUrl = getWorkspaceFhirUrl();
  const results = runPromptOpinionBrowserFhirOperations(
    resources.map((resource) => ({
      method: "POST",
      url: `${baseUrl}/${String(resource["resourceType"] ?? "")}`,
      body: resource,
    })),
  );

  return results.map((result) => {
    if (!result.ok) {
      throw new Error(
        `[po-cookie-auth-fhir] ${result.method} ${result.url} failed with status ${result.status}: ${result.text}`,
      );
    }
    return JSON.parse(result.text) as Record<string, unknown>;
  });
};

export const updateResourcesViaPromptOpinionBrowserAuth = (
  resources: Array<{
    resourceType: string;
    resourceId: string;
    body: Record<string, unknown>;
  }>,
): Record<string, unknown>[] => {
  const baseUrl = getWorkspaceFhirUrl();
  const results = runPromptOpinionBrowserFhirOperations(
    resources.map((resource) => ({
      method: "PUT",
      url: `${baseUrl}/${resource.resourceType}/${resource.resourceId}`,
      body: resource.body,
    })),
  );

  return results.map((result) => {
    if (!result.ok) {
      throw new Error(
        `[po-cookie-auth-fhir] ${result.method} ${result.url} failed with status ${result.status}: ${result.text}`,
      );
    }
    return JSON.parse(result.text) as Record<string, unknown>;
  });
};

export const readBundleViaPromptOpinionBrowserAuth = (
  pathSuffix: string,
): Record<string, unknown> => {
  const baseUrl = getWorkspaceFhirUrl();
  const [result] = runPromptOpinionBrowserFhirOperations([
    {
      method: "GET",
      url: `${baseUrl}/${pathSuffix.replace(/^\/+/, "")}`,
    },
  ]);

  if (!result?.ok) {
    throw new Error(
      `[po-cookie-auth-fhir] GET ${pathSuffix} failed with status ${result?.status}: ${result?.text}`,
    );
  }

  return JSON.parse(result.text) as Record<string, unknown>;
};
