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
      }>;
    };
  }>;
};

const extractText = (payload: GoogleResponseShape): string | null => {
  const candidate = payload.candidates?.[0];
  const text = candidate?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
  return text && text.length > 0 ? text : null;
};

export const generateGoogleResponse = async (request: GoogleRequest): Promise<string> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request.timeoutMs);

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent`;
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
        generationConfig: {
          temperature: 0,
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Google generateContent request failed (${response.status}): ${detail}`);
    }

    const payload = (await response.json()) as GoogleResponseShape;
    const text = extractText(payload);
    if (!text) {
      throw new Error("Google response was empty.");
    }
    return text;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Google request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
