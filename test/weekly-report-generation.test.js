import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { loadJsonFile } from "../src/config/load-config.js";
import {
  buildWeeklyReportUserMessage,
  generateWeeklyReport,
  parseWeeklyReportJson,
  validateWeeklyReportConsistency
} from "../src/report/generate-weekly-report.js";
import { validateWeeklyReportOutput } from "../src/validation/validate-weekly-report-output.js";

async function loadExamples() {
  const macroReviewOutput = await loadJsonFile("data/examples/macro-review.example.json");
  const weeklyReportOutput = await loadJsonFile("data/examples/weekly-report-output.example.json");
  return { macroReviewOutput, weeklyReportOutput };
}

function fakeOpenAIClient(text) {
  return {
    async createResponse({ instructions, input }) {
      assert.ok(instructions.includes("숫자를 재계산하지 않는다"));
      assert.ok(input.includes("숫자를 재계산하지 마라"));
      assert.ok(input.includes("위험 등급을 재판정하지 마라"));
      return { text };
    }
  };
}

test("weekly report generator parses normal JSON and validates schema", async () => {
  const { macroReviewOutput, weeklyReportOutput } = await loadExamples();

  const generated = await generateWeeklyReport({
    macroReviewOutput,
    openaiClient: fakeOpenAIClient(JSON.stringify(weeklyReportOutput))
  });

  assert.equal(generated.schemaVersion, "1.0.0");
  const validation = await validateWeeklyReportOutput(generated);
  assert.equal(validation.valid, true);
});

test("weekly report generator fails on non-JSON AI response", async () => {
  const { macroReviewOutput } = await loadExamples();

  await assert.rejects(
    () => generateWeeklyReport({
      macroReviewOutput,
      openaiClient: fakeOpenAIClient("not json")
    }),
    (error) => error.code === "WEEKLY_REPORT_JSON_PARSE_FAILED"
  );
});

test("weekly report generator fails on schema-invalid JSON", async () => {
  const { macroReviewOutput } = await loadExamples();

  await assert.rejects(
    () => generateWeeklyReport({
      macroReviewOutput,
      openaiClient: fakeOpenAIClient(JSON.stringify({ schemaVersion: "1.0.0" }))
    }),
    (error) => error.code === "WEEKLY_REPORT_SCHEMA_VALIDATION_FAILED"
  );
});

test("weekly report generator fails if AI changes source risk level", async () => {
  const { macroReviewOutput, weeklyReportOutput } = await loadExamples();
  const changed = structuredClone(weeklyReportOutput);
  changed.sourceMacroReview.overallLevel = "normal";

  await assert.rejects(
    () => generateWeeklyReport({
      macroReviewOutput,
      openaiClient: fakeOpenAIClient(JSON.stringify(changed))
    }),
    (error) => error.code === "WEEKLY_REPORT_CONSISTENCY_FAILED"
  );
});

test("weekly report consistency detects theme score or level changes", async () => {
  const { macroReviewOutput, weeklyReportOutput } = await loadExamples();
  const changed = structuredClone(weeklyReportOutput);
  changed.report.portfolioThemes[0].score = changed.report.portfolioThemes[0].score + 1;

  const validation = validateWeeklyReportConsistency({
    macroReviewOutput,
    weeklyReportOutput: changed
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.message.includes("portfolioThemes score")));
});

test("weekly report parser keeps JSON strict", () => {
  assert.deepEqual(parseWeeklyReportJson("{\"ok\":true}"), { ok: true });
  assert.throws(
    () => parseWeeklyReportJson("```json\n{\"ok\":true}\n```"),
    (error) => error.code === "WEEKLY_REPORT_JSON_PARSE_FAILED"
  );
});

test("weekly report prompt and user message enforce no recalculation", async () => {
  const promptText = await readFile("prompts/weekly-analysis.md", "utf8");
  const { macroReviewOutput } = await loadExamples();
  const userMessage = buildWeeklyReportUserMessage(macroReviewOutput);

  for (const phrase of [
    "숫자를 재계산하지 않는다",
    "임계값과 위험 등급을 바꾸지 않는다",
    "입력에 없는 최신 뉴스",
    "특정 종목 추천",
    "실제 개인 보유 수량"
  ]) {
    assert.ok(promptText.includes(phrase), `${phrase} missing from prompt`);
  }

  assert.ok(userMessage.includes("숫자를 재계산하지 마라"));
  assert.ok(userMessage.includes("위험 등급을 재판정하지 마라"));
  assert.ok(userMessage.includes("실제 개인 보유 수량이나 평가금액을 추정하지 마라"));
});
