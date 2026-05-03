import { HiddenRiskInput } from "../clinical-intelligence/contract";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  buildHiddenRiskUserPrompt,
  HIDDEN_RISK_SYSTEM_PROMPT,
} from "../clinical-intelligence/prompt-contract";
import { generateHiddenRiskHeuristicResponse } from "./heuristic-provider";
import { generateGoogleResponse } from "./google-provider";

type LlmProvider = "heuristic" | "google";

type ClientConfig = {
  provider: LlmProvider;
  timeoutMs: number;
  googleApiKey?: string;
  googleModel: string;
};

export type HiddenRiskLlmRuntimeDiagnostics = {
  provider: LlmProvider;
  model: string;
  google_key_present: boolean;
  gemini_key_present: boolean;
  key_present: boolean;
  fallback_mode: "heuristic" | "none";
};

export type HiddenRiskLlmResult = {
  rawText: string;
  provider: LlmProvider;
};

export interface HiddenRiskLlmClient {
  generateHiddenRiskResponse: (input: HiddenRiskInput) => Promise<HiddenRiskLlmResult>;
}

const parseProvider = (value: string | undefined): LlmProvider => {
  const normalized = value?.trim().toLowerCase() || "heuristic";
  if (normalized === "heuristic" || normalized === "google") {
    return normalized;
  }
  throw new Error(
    `Invalid CLINICAL_INTELLIGENCE_LLM_PROVIDER '${value}'. Expected heuristic or google.`,
  );
};

const loadRepoEnvLocal = (env: Record<string, string | undefined>): Record<string, string | undefined> => {
  const candidates = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), "..", ".env.local"),
    path.resolve(process.cwd(), "..", "..", ".env.local"),
  ];
  const envFile = candidates.find((candidate) => existsSync(candidate));
  if (!envFile) {
    return env;
  }

  const merged = { ...env };
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    const key = match?.[1];
    const value = match?.[2];
    if (!key || value === undefined || merged[key]) {
      continue;
    }
    const rawValue = value.trim();
    merged[key] = rawValue.replace(/^(['"])(.*)\1$/, "$2");
  }
  return merged;
};

export const getLlmClientConfigFromEnv = (
  env: Record<string, string | undefined>,
): ClientConfig => {
  const loadedEnv = loadRepoEnvLocal(env);
  const timeoutMs = Number.parseInt(loadedEnv["CLINICAL_INTELLIGENCE_LLM_TIMEOUT_MS"] || "12000", 10);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(
      `Invalid CLINICAL_INTELLIGENCE_LLM_TIMEOUT_MS '${loadedEnv["CLINICAL_INTELLIGENCE_LLM_TIMEOUT_MS"]}'.`,
    );
  }

  return {
    provider: parseProvider(loadedEnv["CLINICAL_INTELLIGENCE_LLM_PROVIDER"]),
    timeoutMs,
    googleApiKey: loadedEnv["GOOGLE_API_KEY"] || loadedEnv["GEMINI_API_KEY"],
    googleModel: loadedEnv["CLINICAL_INTELLIGENCE_GOOGLE_MODEL"] || "gemma-4-31b-it",
  };
};

export const getHiddenRiskLlmRuntimeDiagnostics = (
  env: Record<string, string | undefined>,
): HiddenRiskLlmRuntimeDiagnostics => {
  const loadedEnv = loadRepoEnvLocal(env);
  const config = getLlmClientConfigFromEnv(loadedEnv);
  const googleKeyPresent = Boolean(loadedEnv["GOOGLE_API_KEY"]);
  const geminiKeyPresent = Boolean(loadedEnv["GEMINI_API_KEY"]);
  return {
    provider: config.provider,
    model: config.googleModel,
    google_key_present: googleKeyPresent,
    gemini_key_present: geminiKeyPresent,
    key_present: googleKeyPresent || geminiKeyPresent,
    fallback_mode: config.provider === "heuristic" ? "heuristic" : "none",
  };
};

class DefaultHiddenRiskLlmClient implements HiddenRiskLlmClient {
  constructor(private readonly config: ClientConfig) {}

  async generateHiddenRiskResponse(input: HiddenRiskInput): Promise<HiddenRiskLlmResult> {
    if (this.config.provider === "google") {
      if (!this.config.googleApiKey) {
        throw new Error(
          "GOOGLE_API_KEY (or GEMINI_API_KEY) is required when CLINICAL_INTELLIGENCE_LLM_PROVIDER=google.",
        );
      }

      const userPrompt = buildHiddenRiskUserPrompt(input);
      const rawText = await generateGoogleResponse({
        apiKey: this.config.googleApiKey,
        model: this.config.googleModel,
        timeoutMs: this.config.timeoutMs,
        systemPrompt: HIDDEN_RISK_SYSTEM_PROMPT,
        userPrompt,
      });
      return { rawText, provider: "google" };
    }

    const rawText = await generateHiddenRiskHeuristicResponse(input);
    return { rawText, provider: "heuristic" };
  }
}

let cachedClient: HiddenRiskLlmClient | null = null;

export const getHiddenRiskLlmClient = (): HiddenRiskLlmClient => {
  if (!cachedClient) {
    const config = getLlmClientConfigFromEnv(process.env as Record<string, string | undefined>);
    cachedClient = new DefaultHiddenRiskLlmClient(config);
  }
  return cachedClient;
};
