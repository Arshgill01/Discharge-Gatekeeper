import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { DEFAULT_LOCAL_FHIR_BASE_URL } from "../../typescript/fhir-store";

const DEFAULT_CI_MCP_URL = "http://127.0.0.1:5056/mcp";
const DEFAULT_PATIENT_ID = "db4b066b-200f-405f-9fe4-c52eefbc1425";
const DEFAULT_ENCOUNTER_ID = "daniel-discharge-2026-0419";
const DEFAULT_VERIFY_MAX_MS = 5000;
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 2000;

const ciMcpUrl = process.env["CLINICAL_INTELLIGENCE_MCP_URL"]?.trim() || DEFAULT_CI_MCP_URL;
const patientId = process.env["PROMPT_OPINION_DIRECT_CACHE_WARM_PATIENT_ID"]?.trim() || DEFAULT_PATIENT_ID;
const encounterId =
  process.env["PROMPT_OPINION_DIRECT_CACHE_WARM_ENCOUNTER_ID"]?.trim() || DEFAULT_ENCOUNTER_ID;
const verifyMaxMs = Number.parseInt(
  process.env["PROMPT_OPINION_DIRECT_CACHE_VERIFY_MAX_MS"] || `${DEFAULT_VERIFY_MAX_MS}`,
  10,
);
const retries = Number.parseInt(
  process.env["PROMPT_OPINION_DIRECT_CACHE_WARM_RETRIES"] || `${DEFAULT_RETRIES}`,
  10,
);
const retryDelayMs = Number.parseInt(
  process.env["PROMPT_OPINION_DIRECT_CACHE_WARM_RETRY_DELAY_MS"] || `${DEFAULT_RETRY_DELAY_MS}`,
  10,
);

const remoteFhirAccessToken = process.env["PROMPT_OPINION_FHIR_ACCESS_TOKEN"]?.trim() || "";
const remoteFhirUrlCandidate =
  process.env["PROMPT_OPINION_FHIR_SERVER_URL"]?.trim() ||
  process.env["PO_WORKSPACE_FHIR_URL"]?.trim() ||
  "";
const useRemoteFhir =
  process.env["PROMPT_OPINION_DIRECT_CACHE_WARM_USE_REMOTE_FHIR"] === "1" ||
  (remoteFhirUrlCandidate.length > 0 && remoteFhirAccessToken.length > 0);
const fhirServerUrl = useRemoteFhir ? remoteFhirUrlCandidate : DEFAULT_LOCAL_FHIR_BASE_URL;

const buildHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "x-fhir-server-url": fhirServerUrl,
    "x-patient-id": patientId,
    "x-encounter-id": encounterId,
  };

  if (useRemoteFhir && remoteFhirAccessToken) {
    headers["x-fhir-access-token"] = remoteFhirAccessToken;
  }

  return headers;
};

const delay = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const readToolText = (result: any): string => {
  const text = result?.content?.find((item: any) => item?.type === "text")?.text;
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Warm-up tool response did not contain text output.");
  }
  return text;
};

const verifyWarmText = (text: string): void => {
  assert.match(
    text,
    /discharge.status.*not.?ready|final verdict.*not.?ready/i,
    "Warm-up response must preserve a not_ready discharge result.",
  );
  assert.match(
    text,
    /DocumentReference\/daniel-nursing-note-1840|Nursing Note 2026-04-19 18:40|Nursing Note/i,
    "Warm-up response must include Daniel nursing evidence.",
  );
  assert.match(
    text,
    /DocumentReference\/daniel-pharmacy-note-1815|Pharmacy Note 2026-04-19 18:15|sacubitril/i,
    "Warm-up response must include Daniel medication-access evidence.",
  );
  assert.doesNotMatch(
    text,
    /Maria|Alvarez|2026-04-18|oxygen-stairs|SpO2 82|stairs/i,
    "Warm-up response must not contain stale Maria/April 18 oxygen-stairs fallback evidence.",
  );
  assert.doesNotMatch(
    text,
    /machine_summary/i,
    "Warm-up response must not expose machine_summary.",
  );
};

const withCiClient = async <T>(action: (client: Client) => Promise<T>): Promise<T> => {
  const client = new Client(
    {
      name: "ctc-direct-cache-warmup",
      version: "1.0.0",
    },
    {
      capabilities: {},
    },
  );

  const transport = new StreamableHTTPClientTransport(new URL(ciMcpUrl), {
    requestInit: {
      headers: buildHeaders(),
    },
  });

  await client.connect(transport);
  try {
    return await action(client);
  } finally {
    await client.close();
  }
};

const invokeWarmTool = async (client: Client): Promise<{ elapsedMs: number; text: string }> => {
  const startedAt = Date.now();
  const result = await client.callTool({
    name: "assess_reconciled_discharge_readiness",
    arguments: {
      response_mode: "prompt_opinion_slim",
    },
  });
  const elapsedMs = Date.now() - startedAt;
  const text = readToolText(result);
  verifyWarmText(text);
  return { elapsedMs, text };
};

const main = async (): Promise<void> => {
  console.log(`[direct-warm] ci_mcp_url=${ciMcpUrl}`);
  console.log(`[direct-warm] fhir_server_url=${fhirServerUrl}`);
  console.log(`[direct-warm] patient_id=${patientId}`);
  console.log(`[direct-warm] encounter_id=${encounterId}`);

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const result = await withCiClient(async (client) => {
        const first = await invokeWarmTool(client);
        const second = await invokeWarmTool(client);
        return { first, second };
      });

      console.log(`[direct-warm] first_call_ms=${result.first.elapsedMs}`);
      console.log(`[direct-warm] verify_call_ms=${result.second.elapsedMs}`);

      if (result.second.elapsedMs > verifyMaxMs) {
        throw new Error(
          `Warm verification call stayed too slow (${result.second.elapsedMs} ms > ${verifyMaxMs} ms).`,
        );
      }

      console.log("[direct-warm] PASS: direct patient-scope hidden-risk cache is warm");
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[direct-warm] attempt ${attempt}/${retries} failed: ${message}`);
      if (attempt < retries) {
        await delay(retryDelayMs);
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`[direct-warm] FAIL after ${retries} attempts: ${message}`);
};

void main();
