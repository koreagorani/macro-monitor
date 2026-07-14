import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_NOTION_API_VERSION,
  NotionClient,
  NotionClientError,
  createNotionClientFromEnv
} from "../src/clients/notion-client.js";

function jsonResponse(body, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    json: async () => body
  };
}

test("NotionClient sends versioned data source query without leaking credentials", async () => {
  const calls = [];
  const client = new NotionClient({
    apiKey: "secret-token",
    dataSourceId: "source-id",
    fetchImpl: async (...args) => {
      calls.push(args);
      return jsonResponse({ results: [{ id: "page-id", properties: {} }] });
    }
  });

  const pages = await client.queryPagesByReportKey("weekly-report:2026-07-12");
  assert.deepEqual(pages, [{ id: "page-id", properties: {} }]);
  assert.equal(calls[0][0], "https://api.notion.com/v1/data_sources/source-id/query");
  assert.equal(calls[0][1].headers.Authorization, "Bearer secret-token");
  assert.equal(calls[0][1].headers["Notion-Version"], DEFAULT_NOTION_API_VERSION);
  assert.deepEqual(JSON.parse(calls[0][1].body), {
    filter: { property: "Report Key", rich_text: { equals: "weekly-report:2026-07-12" } },
    page_size: 2
  });
});

test("NotionClient uses native Markdown create and full-content replacement", async () => {
  const requests = [];
  const responses = [jsonResponse({ id: "page-id" }), jsonResponse({ object: "page_markdown" })];
  const client = new NotionClient({
    apiKey: "token",
    dataSourceId: "source",
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return responses.shift();
    }
  });

  await client.createReportPage({ properties: { Name: { title: [] } }, markdown: "# report" });
  await client.replacePageMarkdown({ pageId: "page-id", markdown: "# updated" });

  assert.deepEqual(JSON.parse(requests[0].options.body), {
    parent: { type: "data_source_id", data_source_id: "source" },
    properties: { Name: { title: [] } },
    markdown: "# report"
  });
  assert.equal(requests[1].url, "https://api.notion.com/v1/pages/page-id/markdown");
  assert.deepEqual(JSON.parse(requests[1].options.body), {
    type: "replace_content",
    replace_content: { new_str: "# updated" }
  });
});

test("NotionClient retries 429 and transient server errors only", async () => {
  let calls = 0;
  const delays = [];
  const client = new NotionClient({
    apiKey: "token",
    dataSourceId: "source",
    maxRetries: 2,
    sleep: async (ms) => delays.push(ms),
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) return jsonResponse({}, 429, { "retry-after": "0" });
      if (calls === 2) return jsonResponse({}, 503);
      return jsonResponse({ results: [] });
    }
  });

  assert.deepEqual(await client.queryPagesByReportKey("key"), []);
  assert.equal(calls, 3);
  assert.equal(delays.length, 2);
});

test("NotionClient classifies errors without exposing token or raw response", async () => {
  const client = new NotionClient({
    apiKey: "do-not-expose",
    dataSourceId: "also-private",
    fetchImpl: async () => jsonResponse({ message: "raw private body" }, 403)
  });

  await assert.rejects(
    client.queryPagesByReportKey("key"),
    (error) => {
      assert.ok(error instanceof NotionClientError);
      assert.equal(error.code, "NOTION_FORBIDDEN");
      assert.equal(error.status, 403);
      assert.match(error.message, /query_report_key/);
      assert.doesNotMatch(error.message, /do-not-expose|also-private|raw private body/);
      return true;
    }
  );
});

for (const [status, code] of [
  [401, "NOTION_UNAUTHORIZED"],
  [403, "NOTION_FORBIDDEN"],
  [404, "NOTION_NOT_FOUND"],
  [429, "NOTION_RATE_LIMITED"],
  [500, "NOTION_SERVICE_ERROR"]
]) {
  test(`NotionClient maps HTTP ${status} to ${code}`, async () => {
    const client = new NotionClient({
      apiKey: "token",
      dataSourceId: "source",
      maxRetries: 0,
      fetchImpl: async () => jsonResponse({}, status)
    });
    await assert.rejects(
      client.queryPagesByReportKey("key"),
      (error) => error.code === code && error.status === status
    );
  });
}

test("createNotionClientFromEnv requires both Notion secrets", () => {
  assert.throws(
    () => createNotionClientFromEnv({ env: {} }),
    (error) => error.code === "NOTION_API_KEY_MISSING"
  );
  assert.throws(
    () => createNotionClientFromEnv({ env: { NOTION_API_KEY: "token" } }),
    (error) => error.code === "NOTION_DATA_SOURCE_ID_MISSING"
  );
});
