import assert from "node:assert/strict";
import test from "node:test";

import {
  TelegramClient,
  TelegramClientError,
  createTelegramClientFromEnv
} from "../src/clients/telegram-client.js";

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}

test("TelegramClient sends one HTML sendMessage request", async () => {
  const calls = [];
  const client = new TelegramClient({
    botToken: "bot-token-secret",
    chatId: "chat-id-secret",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return jsonResponse({ ok: true, result: { message_id: 17 } });
    }
  });

  assert.deepEqual(await client.sendMessage({ text: "<b>summary</b>" }), { delivered: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.telegram.org/botbot-token-secret/sendMessage");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    chat_id: "chat-id-secret",
    text: "<b>summary</b>",
    parse_mode: "HTML"
  });
  assert.doesNotMatch(calls[0].options.body, /bot-token-secret/);
});

test("TelegramClient errors do not expose token, chat ID, message, or raw description", async () => {
  const client = new TelegramClient({
    botToken: "do-not-log-token",
    chatId: "do-not-log-chat",
    maxRetries: 0,
    fetchImpl: async () => jsonResponse({
      ok: false,
      error_code: 403,
      description: "raw private response containing do-not-log-chat"
    }, 403)
  });

  await assert.rejects(
    client.sendMessage({ text: "private-message-body" }),
    (error) => {
      assert.ok(error instanceof TelegramClientError);
      assert.equal(error.code, "TELEGRAM_FORBIDDEN");
      assert.doesNotMatch(
        `${error.message} ${JSON.stringify(error)}`,
        /do-not-log-token|do-not-log-chat|private-message-body|raw private response/
      );
      return true;
    }
  );
});

test("TelegramClient retries 429 using retry_after capped at 30 seconds", async () => {
  let calls = 0;
  const delays = [];
  const client = new TelegramClient({
    botToken: "token",
    chatId: "chat",
    sleep: async (ms) => delays.push(ms),
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        return jsonResponse({
          ok: false,
          error_code: 429,
          description: "Too Many Requests",
          parameters: { retry_after: 99 }
        }, 429);
      }
      return jsonResponse({ ok: true, result: {} });
    }
  });

  await client.sendMessage({ text: "summary" });
  assert.equal(calls, 2);
  assert.deepEqual(delays, [30_000]);
});

test("TelegramClient returns TELEGRAM_RATE_LIMITED after retry exhaustion", async () => {
  const client = new TelegramClient({
    botToken: "token",
    chatId: "chat",
    maxRetries: 1,
    sleep: async () => {},
    fetchImpl: async () => jsonResponse({
      ok: false,
      error_code: 429,
      description: "Too Many Requests",
      parameters: { retry_after: 0 }
    }, 429)
  });
  await assert.rejects(
    client.sendMessage({ text: "summary" }),
    (error) => error.code === "TELEGRAM_RATE_LIMITED" && error.status === 429
  );
});

test("TelegramClient retries transient 5xx with 500ms and 1000ms backoff", async () => {
  let calls = 0;
  const delays = [];
  const client = new TelegramClient({
    botToken: "token",
    chatId: "chat",
    sleep: async (ms) => delays.push(ms),
    fetchImpl: async () => {
      calls += 1;
      if (calls < 3) return jsonResponse({ ok: false }, 503);
      return jsonResponse({ ok: true, result: {} });
    }
  });

  await client.sendMessage({ text: "summary" });
  assert.equal(calls, 3);
  assert.deepEqual(delays, [500, 1_000]);
});

test("TelegramClient returns TELEGRAM_SERVICE_ERROR after 5xx retry exhaustion", async () => {
  const client = new TelegramClient({
    botToken: "token",
    chatId: "chat",
    maxRetries: 0,
    fetchImpl: async () => jsonResponse({ ok: false }, 503)
  });
  await assert.rejects(
    client.sendMessage({ text: "summary" }),
    (error) => error.code === "TELEGRAM_SERVICE_ERROR" && error.status === 503
  );
});

test("TelegramClient retries network errors and returns a safe final error", async () => {
  const delays = [];
  const client = new TelegramClient({
    botToken: "network-secret",
    chatId: "chat-secret",
    sleep: async (ms) => delays.push(ms),
    fetchImpl: async () => { throw new Error("raw network failure"); }
  });

  await assert.rejects(
    client.sendMessage({ text: "private body" }),
    (error) => error.code === "TELEGRAM_NETWORK_ERROR"
      && !/network-secret|chat-secret|private body|raw network failure/.test(error.message)
  );
  assert.deepEqual(delays, [500, 1_000]);
});

for (const { name, status, description, code } of [
  { name: "unauthorized", status: 401, description: "Unauthorized", code: "TELEGRAM_UNAUTHORIZED" },
  { name: "forbidden", status: 403, description: "Forbidden", code: "TELEGRAM_FORBIDDEN" },
  { name: "chat not found", status: 400, description: "Bad Request: chat not found", code: "TELEGRAM_CHAT_NOT_FOUND" },
  { name: "bot blocked", status: 403, description: "Forbidden: bot was blocked by the user", code: "TELEGRAM_BOT_BLOCKED" }
]) {
  test(`TelegramClient maps ${name} safely`, async () => {
    const client = new TelegramClient({
      botToken: "token",
      chatId: "chat",
      maxRetries: 0,
      fetchImpl: async () => jsonResponse({ ok: false, error_code: status, description }, status)
    });
    await assert.rejects(
      client.sendMessage({ text: "summary" }),
      (error) => error.code === code && error.status === status && !error.message.includes(description)
    );
  });
}

test("createTelegramClientFromEnv requires both Telegram secrets", () => {
  assert.throws(
    () => createTelegramClientFromEnv({ env: {} }),
    (error) => error.code === "TELEGRAM_BOT_TOKEN_MISSING"
  );
  assert.throws(
    () => createTelegramClientFromEnv({ env: { TELEGRAM_BOT_TOKEN: "token" } }),
    (error) => error.code === "TELEGRAM_CHAT_ID_MISSING"
  );
});
