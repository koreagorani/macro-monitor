import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { loadJsonFile } from "../src/config/load-config.js";
import {
  buildWeeklyReportResponseFormat,
  buildWeeklyReportUserMessage,
  generateWeeklyReport,
  parseWeeklyReportJson,
  validateWeeklyReportConsistency
} from "../src/report/generate-weekly-report.js";
import { validateWeeklyReportOutput } from "../src/validation/validate-weekly-report-output.js";
import { buildReportV2Fixture, GENERATED_AT } from "../test-support/report-v2-fixture.js";

function clone(value) {
  return structuredClone(value);
}

function fakeOpenAIClient(text) {
  return {
    calls: 0,
    async createResponse({ instructions, input, responseFormat }) {
      this.calls += 1;
      assert.ok(instructions.includes("사실을 복사·변경·재계산하지 않는다"));
      assert.ok(input.includes("숫자, 날짜, 단위, 상태, 점수, 임계값을 출력하지 마라"));
      assert.ok(input.includes("위험 등급을 재판정하지 마라"));
      assert.equal(responseFormat.type, "json_schema");
      assert.equal(responseFormat.name, "weekly_analysis_output");
      assert.equal(responseFormat.strict, true);
      assert.equal(responseFormat.schema.type, "object");
      return { text };
    }
  };
}

test("weekly analysis response format uses the local schema without metadata-only keywords", async () => {
  const schema = await loadJsonFile("data/schema/weekly-analysis-output.schema.json");
  const responseFormat = buildWeeklyReportResponseFormat(schema);

  assert.equal(responseFormat.type, "json_schema");
  assert.equal(responseFormat.name, "weekly_analysis_output");
  assert.equal(responseFormat.strict, true);
  assert.equal(responseFormat.schema.$schema, undefined);
  assert.equal(responseFormat.schema.$id, undefined);
  assert.deepEqual(responseFormat.schema.required, schema.required);
  assert.deepEqual(responseFormat.schema.$defs, schema.$defs);
});

test("weekly report generator validates analysis and code-assembles v2 output", async () => {
  const { macroReviewOutput, analysis, reportFacts } = await buildReportV2Fixture();

  const generated = await generateWeeklyReport({
    macroReviewOutput,
    openaiClient: fakeOpenAIClient(JSON.stringify(analysis)),
    generatedAt: GENERATED_AT
  });

  assert.equal(generated.schemaVersion, "2.0.0");
  assert.equal(generated.presentation.title, "주간 매크로 리뷰 — 2026-07-05");
  assert.deepEqual(generated.facts, reportFacts);
  assert.deepEqual(generated.analysis, analysis);
  const validation = await validateWeeklyReportOutput(generated);
  assert.equal(validation.valid, true);
});

test("weekly report warnings are code-owned and propagated from facts and macro review", async () => {
  const { macroReviewOutput, analysis } = await buildReportV2Fixture();
  macroReviewOutput.reportFacts.warnings.push({
    code: "SOURCE_WARNING",
    message: "Synthetic source warning."
  });
  macroReviewOutput.warnings.push({
    code: "MACRO_WARNING",
    message: "Synthetic macro warning."
  });

  const generated = await generateWeeklyReport({
    macroReviewOutput,
    openaiClient: fakeOpenAIClient(JSON.stringify(analysis)),
    generatedAt: GENERATED_AT
  });

  assert.deepEqual(generated.warnings.map(({ code }) => code), ["SOURCE_WARNING", "MACRO_WARNING"]);
});

test("weekly report generator fails on non-JSON AI response", async () => {
  const { macroReviewOutput } = await buildReportV2Fixture();

  await assert.rejects(
    () => generateWeeklyReport({
      macroReviewOutput,
      openaiClient: fakeOpenAIClient("not json")
    }),
    (error) => error.code === "WEEKLY_ANALYSIS_JSON_PARSE_FAILED"
  );
});

test("weekly report generator rejects schema-invalid or canonical fact fields from AI", async () => {
  const { macroReviewOutput, analysis } = await buildReportV2Fixture();
  const changed = clone(analysis);
  changed.score = 123;

  await assert.rejects(
    () => generateWeeklyReport({
      macroReviewOutput,
      openaiClient: fakeOpenAIClient(JSON.stringify(changed))
    }),
    (error) => error.code === "WEEKLY_ANALYSIS_SCHEMA_VALIDATION_FAILED"
  );
});

test("weekly report generator rejects unknown AI area and theme IDs", async () => {
  const { macroReviewOutput, analysis } = await buildReportV2Fixture();
  const changed = clone(analysis);
  changed.areaInsights[0].areaId = "unknown_area";
  changed.themeInsights[0].themeId = "unknown_theme";

  await assert.rejects(
    () => generateWeeklyReport({
      macroReviewOutput,
      openaiClient: fakeOpenAIClient(JSON.stringify(changed))
    }),
    (error) => error.code === "WEEKLY_ANALYSIS_CONSISTENCY_FAILED"
  );
});

test("weekly report consistency detects facts that are not deep-equal", async () => {
  const { macroReviewOutput, weeklyReportOutput } = await buildReportV2Fixture();
  const changed = clone(weeklyReportOutput);
  changed.facts.portfolioThemes[0].score += 1;

  const validation = validateWeeklyReportConsistency({
    macroReviewOutput,
    weeklyReportOutput: changed
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.message.includes("deep-equal")));
});

test("weekly report generation requires facts before calling OpenAI", async () => {
  const { macroReviewOutput, analysis } = await buildReportV2Fixture();
  macroReviewOutput.reportFacts = null;
  const openaiClient = fakeOpenAIClient(JSON.stringify(analysis));

  await assert.rejects(
    () => generateWeeklyReport({ macroReviewOutput, openaiClient }),
    (error) => error.code === "WEEKLY_REPORT_FACTS_UNAVAILABLE"
  );
  assert.equal(openaiClient.calls, 0);
});

test("weekly report parser keeps JSON strict", () => {
  assert.deepEqual(parseWeeklyReportJson("{\"ok\":true}"), { ok: true });
  assert.throws(
    () => parseWeeklyReportJson("```json\n{\"ok\":true}\n```"),
    (error) => error.code === "WEEKLY_ANALYSIS_JSON_PARSE_FAILED"
  );
});

test("weekly report prompt and user message enforce analysis-only ownership", async () => {
  const promptText = await readFile("prompts/weekly-analysis.md", "utf8");
  const { macroReviewOutput } = await buildReportV2Fixture();
  const userMessage = buildWeeklyReportUserMessage(macroReviewOutput);

  for (const fragment of [
    "사실을 복사·변경·재계산하지 않는다",
    "숫자, 날짜, 단위",
    "canonical 이름을 생성하지 않는다",
    "입력에 없는 ID, 뉴스, 가격, 일정",
    "특정 종목의 매수·매도 지시",
    "개인 보유 수량"
  ]) {
    assert.ok(promptText.includes(fragment), `Prompt is missing: ${fragment}`);
  }

  assert.ok(userMessage.includes("숫자, 날짜, 단위, 상태, 점수, 임계값을 출력하지 마라"));
  assert.ok(userMessage.includes("areaInsights와 themeInsights"));
  assert.ok(userMessage.includes("실제 개인 보유 수량이나 평가금액을 추정하지 마라"));
  assert.equal(userMessage.includes("riskOutput"), false);
});
