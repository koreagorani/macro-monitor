import test from "node:test";
import assert from "node:assert/strict";

import {
  OpenAIClient,
  OpenAIClientError,
  createOpenAIClientFromEnv,
  extractOutputText
} from "../src/clients/openai-client.js";

test("OpenAI client requires OPENAI_API_KEY", () => {
  assert.throws(
    () => createOpenAIClientFromEnv({ env: {}, fetchImpl: async () => ({}) }),
    (error) => error instanceof OpenAIClientError && error.code === "OPENAI_API_KEY_MISSING"
  );
});

test("OpenAI client sends authorization without exposing key in errors", async () => {
  let capturedRequest;
  const client = new OpenAIClient({
    apiKey: "secret-test-key",
    model: "test-model",
    fetchImpl: async (url, request) => {
      capturedRequest = { url, request };
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: "resp_test",
          status: "completed",
          model: "test-model",
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: "{\"ok\":true}"
                }
              ]
            }
          ]
        })
      };
    }
  });

  const response = await client.createResponse({
    instructions: "system",
    input: "user"
  });

  assert.equal(capturedRequest.url, "https://api.openai.com/v1/responses");
  assert.equal(capturedRequest.request.headers.Authorization, "Bearer secret-test-key");
  assert.equal(response.text, "{\"ok\":true}");
});

test("OpenAI client reports request failures with safe error message", async () => {
  const client = new OpenAIClient({
    apiKey: "secret-test-key",
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: "do not expose raw body" } })
    })
  });

  await assert.rejects(
    () => client.createResponse({ instructions: "system", input: "user" }),
    (error) => {
      assert.equal(error.code, "OPENAI_API_REQUEST_FAILED");
      assert.equal(error.status, 401);
      assert.equal(error.message.includes("secret-test-key"), false);
      assert.equal(error.message.includes("do not expose raw body"), false);
      return true;
    }
  );
});

test("extractOutputText supports output_text shortcut and message content", () => {
  assert.equal(extractOutputText({ output_text: "direct" }), "direct");
  assert.equal(
    extractOutputText({
      output: [
        {
          content: [
            { type: "output_text", text: "hello" },
            { type: "output_text", text: " world" }
          ]
        }
      ]
    }),
    "hello world"
  );
});
