import assert from "node:assert/strict";
import test from "node:test";

import { buildNotionReportPayload } from "../src/notion/build-notion-report-payload.js";
import { saveWeeklyReportToNotion } from "../src/notion/save-weekly-report-to-notion.js";

const markdown = [
  "# 주간 매크로 리뷰 — 2026-07-12",
  "- 기준일: 2026-07-12",
  "> 취약도는 기대수익률이나 직접적인 매도 신호가 아닙니다."
].join("\n");

function weeklyReport() {
  return {
    schemaVersion: "1.0.0",
    asOf: "2026-07-12",
    generatedAt: "2026-07-12T09:00:00.000Z",
    sourceMacroReview: { overallLevel: "normal", overallScore: 0.2, confidence: "normal" },
    report: {
      title: "주간 매크로 리뷰 — 2026-07-12",
      mandatoryDisclosure: "취약도는 기대수익률이나 직접적인 매도 신호가 아닙니다."
    }
  };
}

function verifiedReadBack() {
  const payload = buildNotionReportPayload({ weeklyReportOutput: weeklyReport(), markdown });
  return {
    page: { properties: payload.properties },
    pageMarkdown: { markdown, truncated: false }
  };
}

function dataSourceSchema() {
  return {
    properties: {
      Name: { type: "title" },
      "Report Date": { type: "date" },
      "Generated At": { type: "date" },
      "Overall Risk": { type: "select" },
      "Overall Score": { type: "number" },
      Confidence: { type: "select" },
      "Schema Version": { type: "rich_text" },
      "Report Key": { type: "rich_text" }
    }
  };
}

test("saveWeeklyReportToNotion creates when Report Key is absent", async () => {
  const calls = [];
  const readBack = verifiedReadBack();
  const notionClient = {
    retrieveDataSource: async () => dataSourceSchema(),
    queryPagesByReportKey: async (key) => { calls.push(["query", key]); return []; },
    createReportPage: async (value) => { calls.push(["create", value]); return { id: "page-id" }; },
    updatePageProperties: async () => assert.fail("must not update"),
    replacePageMarkdown: async () => assert.fail("must not replace"),
    retrievePage: async () => readBack.page,
    retrievePageMarkdown: async () => readBack.pageMarkdown
  };

  const result = await saveWeeklyReportToNotion({ notionClient, weeklyReportOutput: weeklyReport(), markdown });
  assert.deepEqual(result, { status: "created", asOf: "2026-07-12", verified: true });
  assert.equal(calls[0][1], "weekly-report:2026-07-12");
  assert.equal(calls[1][1].markdown, markdown);
});

test("saveWeeklyReportToNotion updates properties and replaces Markdown for one match", async () => {
  const calls = [];
  const readBack = verifiedReadBack();
  const notionClient = {
    retrieveDataSource: async () => dataSourceSchema(),
    queryPagesByReportKey: async () => [{ id: "page-id" }],
    createReportPage: async () => assert.fail("must not create"),
    updatePageProperties: async (value) => calls.push(["properties", value]),
    replacePageMarkdown: async (value) => calls.push(["markdown", value]),
    retrievePage: async () => readBack.page,
    retrievePageMarkdown: async () => readBack.pageMarkdown
  };

  const result = await saveWeeklyReportToNotion({ notionClient, weeklyReportOutput: weeklyReport(), markdown });
  assert.deepEqual(result, { status: "updated", asOf: "2026-07-12", verified: true });
  assert.deepEqual(calls.map(([name]) => name), ["properties", "markdown"]);
  assert.equal(calls[0][1].pageId, "page-id");
  assert.equal(calls[1][1].markdown, markdown);
});

test("saveWeeklyReportToNotion fails safely on duplicate Report Keys", async () => {
  const notionClient = {
    retrieveDataSource: async () => dataSourceSchema(),
    queryPagesByReportKey: async () => [{ id: "one" }, { id: "two" }]
  };
  await assert.rejects(
    saveWeeklyReportToNotion({ notionClient, weeklyReportOutput: weeklyReport(), markdown }),
    (error) => error.code === "NOTION_DUPLICATE_REPORT_KEY"
  );
});

test("saveWeeklyReportToNotion fails when read-back content differs", async () => {
  const readBack = verifiedReadBack();
  readBack.pageMarkdown.markdown = "# wrong report";
  const notionClient = {
    retrieveDataSource: async () => dataSourceSchema(),
    queryPagesByReportKey: async () => [],
    createReportPage: async () => ({ id: "page-id" }),
    retrievePage: async () => readBack.page,
    retrievePageMarkdown: async () => readBack.pageMarkdown
  };
  await assert.rejects(
    saveWeeklyReportToNotion({ notionClient, weeklyReportOutput: weeklyReport(), markdown }),
    (error) => error.code === "NOTION_READ_BACK_VERIFICATION_FAILED"
  );
});

test("saveWeeklyReportToNotion fails before create when data source schema differs", async () => {
  const schema = dataSourceSchema();
  schema.properties["Schema Version"].type = "number";
  const notionClient = {
    retrieveDataSource: async () => schema,
    queryPagesByReportKey: async () => assert.fail("must not query")
  };
  await assert.rejects(
    saveWeeklyReportToNotion({ notionClient, weeklyReportOutput: weeklyReport(), markdown }),
    (error) => error.code === "NOTION_DATA_SOURCE_SCHEMA_MISMATCH"
      && /Schema Version:number->rich_text/.test(error.message)
  );
});
