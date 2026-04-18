import { HiddenRiskInput } from "../clinical-intelligence/contract";
import {
  buildHiddenRiskUserPrompt,
  HIDDEN_RISK_SYSTEM_PROMPT,
} from "../clinical-intelligence/prompt-contract";
import { generateHiddenRiskHeuristicResponse } from "./heuristic-provider";
import { generateOpenAiResponse } from "./openai-provider";

type LlmProvider = "heuristic" | "openai";

type ClientConfig = {
  provider: LlmProvider;
  timeoutMs: number;
  openAiApiKey?: string;
  openAiModel: string;
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
  if (normalized === "heuristic" || normalized === "openai") {
    return normalized;
  }
  throw new Error(
    `Invalid CLINICAL_INTELLIGENCE_LLM_PROVIDER '${value}'. Expected heuristic or openai.`,
  );
};

export const getLlmClientConfigFromEnv = (
  env: Record<string, string | undefined>,
): ClientConfig => {
  const timeoutMs = Number.parseInt(env["CLINICAL_INTELLIGENCE_LLM_TIMEOUT_MS"] || "12000", 10);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(
      `Invalid CLINICAL_INTELLIGENCE_LLM_TIMEOUT_MS '${env["CLINICAL_INTELLIGENCE_LLM_TIMEOUT_MS"]}'.`,
    );
  }

  return {
    provider: parseProvider(env["CLINICAL_INTELLIGENCE_LLM_PROVIDER"]),
    timeoutMs,
    openAiApiKey: env["OPENAI_API_KEY"],
    openAiModel: env["CLINICAL_INTELLIGENCE_OPENAI_MODEL"] || "gpt-4.1-mini",
  };
};

class DefaultHiddenRiskLlmClient implements HiddenRiskLlmClient {
  constructor(private readonly config: ClientConfig) {}

  async generateHiddenRiskResponse(input: HiddenRiskInput): Promise<HiddenRiskLlmResult> {
    if (this.config.provider === "openai") {
      if (!this.config.openAiApiKey) {
        throw new Error(
          "OPENAI_API_KEY is required when CLINICAL_INTELLIGENCE_LLM_PROVIDER=openai.",
        );
      }

      const userPrompt = buildHiddenRiskUserPrompt(input);
      const rawText = await generateOpenAiResponse({
        apiKey: this.config.openAiApiKey,
        model: this.config.openAiModel,
        timeoutMs: this.config.timeoutMs,
        systemPrompt: HIDDEN_RISK_SYSTEM_PROMPT,
        userPrompt,
      });
      return { rawText, provider: "openai" };
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
