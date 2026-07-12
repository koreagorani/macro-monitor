class OpenAIClientError extends Error {
  constructor(code, message, { status = null, cause = null } = {}) {
    super(message);
    this.name = "OpenAIClientError";
    this.code = code;
    this.status = status;
    this.cause = cause;
  }
}

function envOrDefault(value, defaultValue) {
  return typeof value === "string" && value.trim() !== "" ? value : defaultValue;
}

function parsePositiveInteger(value, defaultValue) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

function requireFetch(fetchImpl) {
  if (typeof fetchImpl !== "function") {
    throw new OpenAIClientError(
      "OPENAI_FETCH_UNAVAILABLE",
      "A fetch implementation is required to call the OpenAI API."
    );
  }
}

function extractOutputText(responseBody) {
  if (typeof responseBody?.output_text === "string") {
    return responseBody.output_text;
  }

  const outputItems = Array.isArray(responseBody?.output) ? responseBody.output : [];
  const textParts = [];

  for (const item of outputItems) {
    const contentItems = Array.isArray(item?.content) ? item.content : [];
    for (const content of contentItems) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        textParts.push(content.text);
      }
    }
  }

  return textParts.join("");
}

class OpenAIClient {
  constructor({
    apiKey,
    model = "gpt-4.1",
    baseUrl = "https://api.openai.com/v1",
    fetchImpl = globalThis.fetch,
    maxOutputTokens = 6000,
    responseFormat = { type: "json_object" }
  }) {
    if (!apiKey) {
      throw new OpenAIClientError(
        "OPENAI_API_KEY_MISSING",
        "OPENAI_API_KEY environment variable is required."
      );
    }

    requireFetch(fetchImpl);

    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.fetchImpl = fetchImpl;
    this.maxOutputTokens = maxOutputTokens;
    this.responseFormat = responseFormat;
  }

  async createResponse({ instructions, input, responseFormat = this.responseFormat }) {
    let response;

    try {
      response = await this.fetchImpl(`${this.baseUrl}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          instructions,
          input,
          max_output_tokens: this.maxOutputTokens,
          text: {
            format: responseFormat
          }
        })
      });
    } catch (error) {
      throw new OpenAIClientError(
        "OPENAI_API_NETWORK_ERROR",
        "OpenAI API request failed before receiving a response.",
        { cause: error }
      );
    }

    if (!response.ok) {
      throw new OpenAIClientError(
        "OPENAI_API_REQUEST_FAILED",
        `OpenAI API request failed with status ${response.status}.`,
        { status: response.status }
      );
    }

    let responseBody;
    try {
      responseBody = await response.json();
    } catch (error) {
      throw new OpenAIClientError(
        "OPENAI_API_INVALID_JSON_RESPONSE",
        "OpenAI API response could not be parsed as JSON.",
        { cause: error }
      );
    }

    if (responseBody?.error) {
      throw new OpenAIClientError(
        "OPENAI_API_RESPONSE_ERROR",
        "OpenAI API returned an error response.",
        { status: response.status }
      );
    }

    if (responseBody?.status && responseBody.status !== "completed") {
      throw new OpenAIClientError(
        "OPENAI_API_INCOMPLETE_RESPONSE",
        `OpenAI API response ended with status ${responseBody.status}.`,
        { status: response.status }
      );
    }

    const text = extractOutputText(responseBody);
    if (!text) {
      throw new OpenAIClientError(
        "OPENAI_API_EMPTY_OUTPUT",
        "OpenAI API response did not include output text."
      );
    }

    return {
      text,
      responseId: responseBody.id ?? null,
      model: responseBody.model ?? this.model,
      status: responseBody.status ?? null
    };
  }
}

function createOpenAIClientFromEnv({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  return new OpenAIClient({
    apiKey: env.OPENAI_API_KEY,
    model: envOrDefault(env.OPENAI_MODEL, "gpt-4.1"),
    baseUrl: envOrDefault(env.OPENAI_BASE_URL, "https://api.openai.com/v1"),
    fetchImpl,
    maxOutputTokens: parsePositiveInteger(env.OPENAI_MAX_OUTPUT_TOKENS, 6000)
  });
}

export {
  OpenAIClient,
  OpenAIClientError,
  createOpenAIClientFromEnv,
  extractOutputText
};