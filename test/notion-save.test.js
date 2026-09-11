import assert from "node:assert/strict";
import test from "node:test";

import { buildNotionReportPayload } from "../src/notion/build-notion-report-payload.js";
import { loadJsonFile } from "../src/config/load-config.js";
import { renderWeeklyReportMarkdown } from "../src/render/render-weekly-report-markdown.js";
import {
  hasGfmTableSeparator,
  hasPlaceholderTableRow,
  readBackMismatches,
  saveWeeklyReportToNotion,
  verifyReadBack
} from "../src/notion/save-weekly-report-to-notion.js";

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

test("saveWeeklyReportToNotion fails when required read-back body coverage differs", async () => {
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
    saveWeeklyReportToNotion({
      notionClient,
      weeklyReportOutput: weeklyReport(),
      markdown,
      readBackAttempts: 1
    }),
    (error) => error.code === "NOTION_READ_BACK_VERIFICATION_FAILED"
      && /markdown\.asOf/.test(error.message)
      && /markdown\.disclosure/.test(error.message)
  );
});

test("saveWeeklyReportToNotion retries temporarily stale read-back", async () => {
  const readBack = verifiedReadBack();
  let markdownReads = 0;
  const delays = [];
  const notionClient = {
    retrieveDataSource: async () => dataSourceSchema(),
    queryPagesByReportKey: async () => [],
    createReportPage: async () => ({ id: "page-id" }),
    retrievePage: async () => readBack.page,
    retrievePageMarkdown: async () => {
      markdownReads += 1;
      return markdownReads === 1 ? { markdown: "", truncated: false } : readBack.pageMarkdown;
    }
  };
  const result = await saveWeeklyReportToNotion({
    notionClient,
    weeklyReportOutput: weeklyReport(),
    markdown,
    sleep: async (ms) => delays.push(ms)
  });
  assert.equal(result.verified, true);
  assert.equal(markdownReads, 2);
  assert.deepEqual(delays, [500]);
});

test("saveWeeklyReportToNotion accepts Notion minute-level Generated At normalization", async () => {
  const readBack = verifiedReadBack();
  readBack.page.properties["Generated At"].date.start = "2026-07-12T09:00:00.000+00:00";
  const report = weeklyReport();
  report.generatedAt = "2026-07-12T09:00:42.567Z";
  const notionClient = {
    retrieveDataSource: async () => dataSourceSchema(),
    queryPagesByReportKey: async () => [{ id: "page-id" }],
    updatePageProperties: async () => {},
    replacePageMarkdown: async () => {},
    retrievePage: async () => readBack.page,
    retrievePageMarkdown: async () => readBack.pageMarkdown
  };
  const result = await saveWeeklyReportToNotion({
    notionClient,
    weeklyReportOutput: report,
    markdown
  });
  assert.equal(result.verified, true);
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

test("v2 Notion read-back verifies the data-first section and all six indicators", async () => {
  const report = await loadJsonFile("data/examples/weekly-report-output.example.json");
  const renderedMarkdown = renderWeeklyReportMarkdown(report);
  const payload = buildNotionReportPayload({ weeklyReportOutput: report, markdown: renderedMarkdown });
  const mismatches = readBackMismatches({
    page: { properties: payload.properties },
    pageMarkdown: { markdown: renderedMarkdown, truncated: false },
    expected: payload.expected
  });
  assert.deepEqual(mismatches, []);
});

test("v2 Notion read-back treats property.Name as the authoritative page title", async () => {
  const report = await loadJsonFile("data/examples/weekly-report-output.example.json");
  const renderedMarkdown = renderWeeklyReportMarkdown(report);
  const payload = buildNotionReportPayload({ weeklyReportOutput: report, markdown: renderedMarkdown });
  const withoutTitleHeading = renderedMarkdown.split("\n").slice(2).join("\n");
  const mismatches = readBackMismatches({
    page: { properties: payload.properties },
    pageMarkdown: { markdown: withoutTitleHeading, truncated: false },
    expected: payload.expected
  });

  assert.deepEqual(mismatches, []);
});

test("v2 Notion read-back still fails when property.Name differs", async () => {
  const report = await loadJsonFile("data/examples/weekly-report-output.example.json");
  const renderedMarkdown = renderWeeklyReportMarkdown(report);
  const payload = buildNotionReportPayload({ weeklyReportOutput: report, markdown: renderedMarkdown });
  payload.properties.Name.title[0].text.content = "다른 페이지 제목";
  const mismatches = readBackMismatches({
    page: { properties: payload.properties },
    pageMarkdown: { markdown: renderedMarkdown, truncated: false },
    expected: payload.expected
  });

  assert.deepEqual(mismatches, ["property.Name"]);
});

test("v2 Notion read-back still requires asOf and disclosure body coverage", async () => {
  const report = await loadJsonFile("data/examples/weekly-report-output.example.json");
  const renderedMarkdown = renderWeeklyReportMarkdown(report);
  const payload = buildNotionReportPayload({ weeklyReportOutput: report, markdown: renderedMarkdown });
  const withoutAsOf = renderedMarkdown.replaceAll(report.asOf, "누락된 기준일");
  const withoutDisclosure = renderedMarkdown.replaceAll(
    report.presentation.mandatoryDisclosure,
    "누락된 주의 문구"
  );

  assert.ok(readBackMismatches({
    page: { properties: payload.properties },
    pageMarkdown: { markdown: withoutAsOf, truncated: false },
    expected: payload.expected
  }).includes("markdown.asOf"));
  assert.ok(readBackMismatches({
    page: { properties: payload.properties },
    pageMarkdown: { markdown: withoutDisclosure, truncated: false },
    expected: payload.expected
  }).includes("markdown.disclosure"));
});

test("v2 Notion read-back reports only the missing indicator coverage key", async () => {
  const report = await loadJsonFile("data/examples/weekly-report-output.example.json");
  const renderedMarkdown = renderWeeklyReportMarkdown(report);
  const payload = buildNotionReportPayload({ weeklyReportOutput: report, markdown: renderedMarkdown });
  const withoutBitcoin = renderedMarkdown.replaceAll("비트코인", "누락된 지표");
  const mismatches = readBackMismatches({
    page: { properties: payload.properties },
    pageMarkdown: { markdown: withoutBitcoin, truncated: false },
    expected: payload.expected
  });

  assert.deepEqual(mismatches, ["markdown.indicator.btc"]);
  assert.doesNotMatch(mismatches.join(","), /누락된 지표|105,432|private/);
});

test("v2 Notion read-back failure does not expose stored Markdown", async () => {
  const report = await loadJsonFile("data/examples/weekly-report-output.example.json");
  const renderedMarkdown = renderWeeklyReportMarkdown(report);
  const payload = buildNotionReportPayload({ weeklyReportOutput: report, markdown: renderedMarkdown });
  const withoutWti = renderedMarkdown.replaceAll("WTI", "PRIVATE_MARKDOWN_TOKEN");

  assert.throws(
    () => verifyReadBack({
      page: { properties: payload.properties },
      pageMarkdown: { markdown: withoutWti, truncated: false },
      expected: payload.expected
    }),
    (error) => {
      assert.equal(error.code, "NOTION_READ_BACK_VERIFICATION_FAILED");
      assert.match(error.message, /markdown\.indicator\.wti/);
      assert.doesNotMatch(error.message, /PRIVATE_MARKDOWN_TOKEN|75\.3 USD\/barrel/);
      return true;
    }
  );
});

test("Notion read-back detects GFM separators and enhanced Markdown placeholder rows", () => {
  assert.equal(hasGfmTableSeparator("| A | B |\n|---|---:|\n| 1 | 2 |"), true);
  assert.equal(hasGfmTableSeparator("<table><tr><td>A</td></tr></table>"), false);
  assert.equal(hasPlaceholderTableRow("<table><tr><td>---</td><td>---:</td></tr></table>"), true);
  assert.equal(hasPlaceholderTableRow("<table><tr><td>정상</td><td>---</td></tr></table>"), false);
});

test("v2 save preserves create/upsert behavior while enforcing indicator coverage", async () => {
  const report = await loadJsonFile("data/examples/weekly-report-output.example.json");
  const renderedMarkdown = renderWeeklyReportMarkdown(report);
  const payload = buildNotionReportPayload({ weeklyReportOutput: report, markdown: renderedMarkdown });
  const notionClient = {
    retrieveDataSource: async () => dataSourceSchema(),
    queryPagesByReportKey: async () => [],
    createReportPage: async () => ({ id: "page-id" }),
    retrievePage: async () => ({ properties: payload.properties }),
    retrievePageMarkdown: async () => ({ markdown: renderedMarkdown, truncated: false })
  };

  const result = await saveWeeklyReportToNotion({
    notionClient,
    weeklyReportOutput: report,
    markdown: renderedMarkdown
  });
  assert.deepEqual(result, { status: "created", asOf: report.asOf, verified: true });
});
