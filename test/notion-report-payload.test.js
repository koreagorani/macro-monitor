import assert from "node:assert/strict";
import test from "node:test";

import { buildNotionReportPayload } from "../src/notion/build-notion-report-payload.js";

function weeklyReport(overrides = {}) {
  return {
    schemaVersion: "1.0.0",
    asOf: "2026-07-12",
    generatedAt: "2026-07-12T09:00:00.000Z",
    sourceMacroReview: {
      overallLevel: "normal",
      overallScore: 0.2,
      confidence: "normal"
    },
    report: {
      title: "주간 매크로 리뷰 — 2026-07-12",
      mandatoryDisclosure: "취약도는 기대수익률이나 직접적인 매도 신호가 아닙니다."
    },
    ...overrides
  };
}

test("buildNotionReportPayload maps only the documented metadata", () => {
  const input = weeklyReport({
    privateHoldings: { quantity: 10, marketValue: 999 },
    accountWeight: 0.7
  });
  const payload = buildNotionReportPayload({ weeklyReportOutput: input, markdown: "# report" });

  assert.equal(payload.reportKey, "weekly-report:2026-07-12");
  assert.equal(payload.properties.Name.type, "title");
  assert.equal(payload.properties.Name.title[0].text.content, input.report.title);
  assert.equal(payload.properties["Report Date"].type, "date");
  assert.equal(payload.properties["Report Date"].date.start, input.asOf);
  assert.equal(payload.properties["Generated At"].date.start, input.generatedAt);
  assert.equal(payload.properties["Overall Risk"].select.name, "normal");
  assert.equal(payload.properties["Overall Score"].type, "number");
  assert.equal(payload.properties["Overall Score"].number, 0.2);
  assert.equal(payload.properties.Confidence.select.name, "normal");
  assert.equal(payload.properties["Schema Version"].type, "rich_text");
  assert.equal(payload.properties["Schema Version"].rich_text[0].text.content, "1.0.0");
  assert.equal(payload.properties["Report Key"].rich_text[0].text.content, payload.reportKey);
  assert.equal(payload.markdown, "# report");
  assert.doesNotMatch(JSON.stringify(payload), /privateHoldings|quantity|marketValue|accountWeight/);
});

test("buildNotionReportPayload preserves a null overall score", () => {
  const input = weeklyReport();
  input.sourceMacroReview.overallScore = null;
  const payload = buildNotionReportPayload({ weeklyReportOutput: input, markdown: "# report" });
  assert.equal(payload.properties["Overall Score"].number, null);
});

test("buildNotionReportPayload rejects missing required metadata", () => {
  const input = weeklyReport();
  delete input.report.title;
  assert.throws(
    () => buildNotionReportPayload({ weeklyReportOutput: input, markdown: "# report" }),
    (error) => error.code === "NOTION_REPORT_METADATA_INVALID"
  );
});
