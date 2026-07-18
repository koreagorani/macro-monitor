const DEFAULT_TELEGRAM_BASE_URL = "https://api.telegram.org";
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

class TelegramClientError extends Error {
  constructor(code, message, { status = null } = {}) {
    super(message);
    this.name = "TelegramClientError";
    this.code = code;
    this.status = status;
  }
}

function requiredString(value, code, message) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TelegramClientError(code, message);
  }
  return value.trim();
}

async function readErrorMetadata(response) {
  try {
    const body = await response.json();
    return {
      errorCode: Number.isInteger(body?.error_code) ? body.error_code : null,
      description: typeof body?.description === "string" ? body.description : "",
      retryAfter: Number(body?.parameters?.retry_after)
    };
  } catch {
    return { errorCode: null, description: "", retryAfter: Number.NaN };
  }
}

function statusError(status, metadata = {}) {
  const description = metadata.description ?? "";
  let code;

  if (status === 401) {
    code = "TELEGRAM_UNAUTHORIZED";
  } else if (status === 403 && /blocked by the user|bot (?:was|is) blocked/i.test(description)) {
    code = "TELEGRAM_BOT_BLOCKED";
  } else if (status === 403) {
    code = "TELEGRAM_FORBIDDEN";
  } else if (status === 400 && /chat not found/i.test(description)) {
    code = "TELEGRAM_CHAT_NOT_FOUND";
  } else if (status === 400) {
    code = "TELEGRAM_BAD_REQUEST";
  } else if (status === 429) {
    code = "TELEGRAM_RATE_LIMITED";
  } else if (status >= 500) {
    code = "TELEGRAM_SERVICE_ERROR";
  } else {
    code = "TELEGRAM_API_REQUEST_FAILED";
  }

  return new TelegramClientError(
    code,
    `Telegram API request failed with status ${status}.`,
    { status }
  );
}

function retryDelayMs({ status, retryAfter, attempt }) {
  if (status === 429 && Number.isFinite(retryAfter) && retryAfter >= 0) {
    return Math.min(retryAfter * 1000, 30_000);
  }
  return attempt === 0 ? 500 : 1_000;
}

class TelegramClient {
  constructor({
    botToken,
    chatId,
    baseUrl = DEFAULT_TELEGRAM_BASE_URL,
    fetchImpl = globalThis.fetch,
    maxRetries = 2,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  }) {
    this.botToken = requiredString(
      botToken,
      "TELEGRAM_BOT_TOKEN_MISSING",
      "TELEGRAM_BOT_TOKEN is required."
    );
    this.chatId = requiredString(
      chatId,
      "TELEGRAM_CHAT_ID_MISSING",
      "TELEGRAM_CHAT_ID is required."
    );
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.fetchImpl = fetchImpl;
    this.maxRetries = maxRetries;
    this.sleep = sleep;
  }

  async sendMessage({ text }) {
    const message = requiredString(
      text,
      "TELEGRAM_MESSAGE_MISSING",
      "Telegram message text is required."
    );
    const requestUrl = `${this.baseUrl}/bot${this.botToken}/sendMessage`;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      let response;
      try {
        response = await this.fetchImpl(requestUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: this.chatId,
            text: message,
            parse_mode: "HTML"
          })
        });
      } catch {
        if (attempt < this.maxRetries) {
          await this.sleep(retryDelayMs({ status: null, retryAfter: null, attempt }));
          continue;
        }
        throw new TelegramClientError(
          "TELEGRAM_NETWORK_ERROR",
          "Telegram API request failed before receiving a response."
        );
      }

      if (!response.ok) {
        const metadata = await readErrorMetadata(response);
        if (RETRYABLE_STATUSES.has(response.status) && attempt < this.maxRetries) {
          await this.sleep(retryDelayMs({
            status: response.status,
            retryAfter: metadata.retryAfter,
            attempt
          }));
          continue;
        }
        throw statusError(response.status, metadata);
      }

      let body;
      try {
        body = await response.json();
      } catch {
        throw new TelegramClientError(
          "TELEGRAM_INVALID_JSON_RESPONSE",
          "Telegram API response could not be parsed as JSON.",
          { status: response.status }
        );
      }

      if (body?.ok !== true) {
        const status = Number.isInteger(body?.error_code) ? body.error_code : response.status;
        throw statusError(status, {
          description: typeof body?.description === "string" ? body.description : ""
        });
      }

      return { delivered: true };
    }

    throw new TelegramClientError(
      "TELEGRAM_API_REQUEST_FAILED",
      "Telegram API request failed."
    );
  }
}

function createTelegramClientFromEnv({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  return new TelegramClient({
    botToken: env.TELEGRAM_BOT_TOKEN,
    chatId: env.TELEGRAM_CHAT_ID,
    fetchImpl
  });
}

export {
  DEFAULT_TELEGRAM_BASE_URL,
  TelegramClient,
  TelegramClientError,
  createTelegramClientFromEnv,
  retryDelayMs
};
