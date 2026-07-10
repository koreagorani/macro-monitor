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

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function macroReviewFromWeeklyReport(weeklyReportOutput) {
  return {
    schemaVersion: "1.0.0",
    asOf: weeklyReportOutput.asOf,
    generatedAt: "2026-07-05T00:00:00.000Z",
    dataSourceSummary: {
      source: "synthetic_test_fixture",
      riskAsOf: weeklyReportOutput.asOf,
      indicatorCount: 6,
      availableIndicatorCount: 6,
      unavailableIndicatorCount: 0,
      riskQualityConfidence: weeklyReportOutput.sourceMacroReview.confidence,
      riskShouldAbort: false,
      portfolioVulnerabilityCalculated: true
    },
    riskOutput: {
      schemaVersion: "1.0.0",
      asOf: weeklyReportOutput.asOf,
      quality: {
        shouldAbort: false,
        confidence: weeklyReportOutput.sourceMacroReview.confidence
      },
      areaRisks: weeklyReportOutput.report.areaRisks.map((area) => ({
        areaId: area.areaId,
        name: area.name,
        score: area.score,
        status: area.status
      })),
      overallRisk: {
        level: weeklyReportOutput.sourceMacroReview.overallLevel,
        score: weeklyReportOutput.sourceMacroReview.overallScore
      },
      warnings: []
    },
    portfolioVulnerability: {
      schemaVersion: "1.0.0",
      asOf: weeklyReportOutput.asOf,
      sourceRisk: {
        overallLevel: weeklyReportOutput.sourceMacroReview.overallLevel,
        overallScore: weeklyReportOutput.sourceMacroReview.overallScore,
        confidence: weeklyReportOutput.sourceMacroReview.confidence,
        triggeredRules: []
      },
      selection: {
        policy: "top_3_by_score",
        displayedThemeCount: weeklyReportOutput.sourceMacroReview.topThemeIds.length,
        evaluatedThemeCount: weeklyReportOutput.sourceMacroReview.topThemeIds.length
      },
      themeVulnerabilities: weeklyReportOutput.report.portfolioThemes.map((theme) => ({
        themeId: theme.themeId,
        name: theme.name,
        score: theme.score,
        level: theme.level
      })),
      warnings: []
    },
    warnings: []
  };
}

async function loadFixtures() {
  const weeklyReportOutput = await loadJsonFile("data/examples/weekly-report-output.example.json");
  const macroReviewOutput = macroReviewFromWeeklyReport(weeklyReportOutput);
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
  const { macroReviewOutput, weeklyReportOutput } = await loadFixtures();

  const generated = await generateWeeklyReport({
    macroReviewOutput,
    openaiClient: fakeOpenAIClient(JSON.stringify(weeklyReportOutput))
  });

  assert.equal(generated.schemaVersion, "1.0.0");
  const validation = await validateWeeklyReportOutput(generated);
  assert.equal(validation.valid, true);
});

test("weekly report generator fails on non-JSON AI response", async () => {
  const { macroReviewOutput } = await loadFixtures();

  await assert.rejects(
    () => generateWeeklyReport({
      macroReviewOutput,
      openaiClient: fakeOpenAIClient("not json")
    }),
    (error) => error.code === "WEEKLY_REPORT_JSON_PARSE_FAILED"
  );
});

test("weekly report generator fails on schema-invalid JSON", async () => {
  const { macroReviewOutput } = await loadFixtures();

  await assert.rejects(
    () => generateWeeklyReport({
      macroReviewOutput,
      openaiClient: fakeOpenAIClient(JSON.stringify({ schemaVersion: "1.0.0" }))
    }),
    (error) => error.code === "WEEKLY_REPORT_SCHEMA_VALIDATION_FAILED"
  );
});

test("weekly report generator fails if AI changes source risk level", async () => {
  const { macroReviewOutput, weeklyReportOutput } = await loadFixtures();
  const changed = deepClone(weeklyReportOutput);
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
  const { macroReviewOutput, weeklyReportOutput } = await loadFixtures();
  const changed = deepClone(weeklyReportOutput);
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
  const { macroReviewOutput } = await loadFixtures();
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
