type OpenAiRequest = {
  apiKey: string;
  model: string;
  timeoutMs: number;
  systemPrompt: string;
  userPrompt: string;
};

type OpenAiResponseShape = {
  output_text?: string;
};

export const generateOpenAiResponse = async (request: OpenAiRequest): Promise<string> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request.timeoutMs);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${request.apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: request.model,
        temperature: 0,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: request.systemPrompt }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: request.userPrompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI request failed (${response.status}): ${detail}`);
    }

    const payload = (await response.json()) as OpenAiResponseShape;
    const text = payload.output_text;
    if (!text || text.trim().length === 0) {
      throw new Error("OpenAI response was empty.");
    }

    return text;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("OpenAI request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
