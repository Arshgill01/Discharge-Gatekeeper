type GoogleRequest = {
  apiKey: string;
  model: string;
  timeoutMs: number;
  systemPrompt: string;
  userPrompt: string;
};

type GoogleResponseShape = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        thought?: boolean;
      }>;
    };
  }>;
};

type GenerationConfig = {
  temperature: number;
  candidateCount: number;
  maxOutputTokens: number;
  responseMimeType: "application/json";
  thinkingConfig?: {
    thinkingLevel?: string;
    thinkingBudget?: number;
  };
};

const extractText = (payload: GoogleResponseShape): string | null => {
  const candidate = payload.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  const nonThoughtParts = parts.filter((part) => !part.thought && part.text);
  const preferredParts = nonThoughtParts.length > 0 ? nonThoughtParts : parts.filter((part) => part.text);
  const text = preferredParts
    .map((part) => part.text || "")
    .join("")
    .trim();
  return text && text.length > 0 ? text : null;
};

const buildGenerationConfig = (model: string) => {
  const normalizedModel = normalizeGoogleModelCode(model);
  const config: GenerationConfig = {
    temperature: 0,
    candidateCount: 1,
    maxOutputTokens: 2048,
    responseMimeType: "application/json",
  };

  if (normalizedModel.startsWith("gemini-3")) {
    config.thinkingConfig = {
      thinkingLevel: "low",
    };
    return config;
  }

  if (normalizedModel.startsWith("gemini-2.5")) {
    config.thinkingConfig = {
      thinkingBudget: 0,
    };
  }

  return config;
};

const normalizeGoogleModelCode = (model: string): string => model.trim().toLowerCase();

export const generateGoogleResponse = async (request: GoogleRequest): Promise<string> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request.timeoutMs);
  const startedAt = Date.now();
  const maxAttempts = 3;
  let attempt = 0;

  try {
    const modelCode = normalizeGoogleModelCode(request.model);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelCode}:generateContent`;
    while (attempt < maxAttempts) {
      attempt += 1;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": request.apiKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: request.systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: request.userPrompt }],
            },
          ],
          generationConfig: buildGenerationConfig(request.model),
        }),
      });

      if (!response.ok) {
        const detail = await response.text();
        const transient = response.status === 429 || response.status >= 500;
        const elapsedMs = Date.now() - startedAt;
        const remainingMs = request.timeoutMs - elapsedMs;
        if (transient && attempt < maxAttempts && remainingMs > 1500) {
          const backoffMs = Math.min(1000 * attempt, Math.max(remainingMs - 500, 250));
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }
        throw new Error(`Google generateContent request failed (${response.status}): ${detail}`);
      }

      const payload = (await response.json()) as GoogleResponseShape;
      const text = extractText(payload);
      if (!text) {
        throw new Error("Google response was empty.");
      }
      return text;
    }

    throw new Error("Google request failed after retries.");
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Google request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
