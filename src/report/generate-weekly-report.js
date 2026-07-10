import { readFile } from "node:fs/promises";

import { validateWeeklyReportOutput } from "../validation/validate-weekly-report-output.js";

class WeeklyReportGenerationError extends Error {
  constructor(code, message, { errors = [], cause = null } = {}) {
    super(message);
    this.name = "WeeklyReportGenerationError";
    this.code = code;
    this.errors = errors;
    this.cause = cause;
  }
}

function compactValidationErrors(errors = []) {
  return errors.map(({ instancePath, keyword, message }) => ({
    instancePath,
    keyword,
    message
  }));
}

function buildWeeklyReportUserMessage(macroReviewOutput) {
  return [
    "아래 macroReviewOutput을 바탕으로 weekly-report-output JSON을 생성해줘.",
    "",
    "절대 규칙:",
    "- 숫자를 재계산하지 마라.",
    "- 위험 등급을 재판정하지 마라.",
    "- 임계값을 바꾸지 마라.",
    "- 입력에 없는 최신 뉴스, 가격, 일정을 만들지 마라.",
    "- 특정 종목 추천을 하지 마라.",
    "- 실제 개인 보유 수량이나 평가금액을 추정하지 마라.",
    "- JSON 외 텍스트를 출력하지 마라.",
    "",
    "macroReviewOutput:",
    JSON.stringify(macroReviewOutput, null, 2)
  ].join("\n");
}

function parseWeeklyReportJson(rawText) {
  try {
    return JSON.parse(rawText.trim());
  } catch (error) {
    throw new WeeklyReportGenerationError(
      "WEEKLY_REPORT_JSON_PARSE_FAILED",
      "AI weekly report response was not valid JSON.",
      { cause: error }
    );
  }
}

function sameNumberOrNull(left, right) {
  if (left === null && right === null) return true;
  if (typeof left === "number" && typeof right === "number") {
    return Math.abs(left - right) < 1e-12;
  }
  return left === right;
}

function assertConsistency(condition, message, errors) {
  if (!condition) {
    errors.push({
      instancePath: "",
      keyword: "macroReviewConsistency",
      message
    });
  }
}

function validateWeeklyReportConsistency({ weeklyReportOutput, macroReviewOutput }) {
  const errors = [];
  const expectedOverallRisk = macroReviewOutput.riskOutput?.overallRisk ?? null;
  const sourceMacroReview = weeklyReportOutput.sourceMacroReview;

  assertConsistency(
    weeklyReportOutput.asOf === macroReviewOutput.asOf,
    "weekly report asOf must match macroReviewOutput.asOf.",
    errors
  );
  assertConsistency(
    sourceMacroReview.asOf === macroReviewOutput.asOf,
    "sourceMacroReview.asOf must match macroReviewOutput.asOf.",
    errors
  );
  assertConsistency(
    sourceMacroReview.overallLevel === (expectedOverallRisk?.level ?? null),
    "sourceMacroReview.overallLevel must match macroReviewOutput.riskOutput.overallRisk.level.",
    errors
  );
  assertConsistency(
    sameNumberOrNull(sourceMacroReview.overallScore, expectedOverallRisk?.score ?? null),
    "sourceMacroReview.overallScore must match macroReviewOutput.riskOutput.overallRisk.score.",
    errors
  );
  assertConsistency(
    sourceMacroReview.confidence === macroReviewOutput.riskOutput?.quality?.confidence,
    "sourceMacroReview.confidence must match macroReviewOutput.riskOutput.quality.confidence.",
    errors
  );

  const expectedTopThemeIds = (macroReviewOutput.portfolioVulnerability?.themeVulnerabilities ?? [])
    .slice(0, 3)
    .map((theme) => theme.themeId);
  assertConsistency(
    JSON.stringify(sourceMacroReview.topThemeIds) === JSON.stringify(expectedTopThemeIds),
    "sourceMacroReview.topThemeIds must match portfolioVulnerability top theme ids.",
    errors
  );

  const sourceAreaMap = new Map((macroReviewOutput.riskOutput?.areaRisks ?? []).map((area) => [area.areaId, area]));
  for (const area of weeklyReportOutput.report?.areaRisks ?? []) {
    const sourceArea = sourceAreaMap.get(area.areaId);
    assertConsistency(
      Boolean(sourceArea),
      `report.areaRisks contains unknown areaId ${area.areaId}.`,
      errors
    );
    if (sourceArea) {
      assertConsistency(
        sameNumberOrNull(area.score, sourceArea.score),
        `report.areaRisks score for ${area.areaId} must match macroReviewOutput.`,
        errors
      );
      assertConsistency(
        area.status === sourceArea.status,
        `report.areaRisks status for ${area.areaId} must match macroReviewOutput.`,
        errors
      );
    }
  }

  const sourceThemeMap = new Map((macroReviewOutput.portfolioVulnerability?.themeVulnerabilities ?? []).map((theme) => [theme.themeId, theme]));
  for (const theme of weeklyReportOutput.report?.portfolioThemes ?? []) {
    const sourceTheme = sourceThemeMap.get(theme.themeId);
    assertConsistency(
      Boolean(sourceTheme),
      `report.portfolioThemes contains unknown themeId ${theme.themeId}.`,
      errors
    );
    if (sourceTheme) {
      assertConsistency(
        sameNumberOrNull(theme.score, sourceTheme.score),
        `report.portfolioThemes score for ${theme.themeId} must match macroReviewOutput.`,
        errors
      );
      assertConsistency(
        theme.level === sourceTheme.level,
        `report.portfolioThemes level for ${theme.themeId} must match macroReviewOutput.`,
        errors
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

async function generateWeeklyReport({
  macroReviewOutput,
  openaiClient,
  promptPath = "prompts/weekly-analysis.md"
}) {
  const promptText = await readFile(promptPath, "utf8");
  const userMessage = buildWeeklyReportUserMessage(macroReviewOutput);

  const aiResponse = await openaiClient.createResponse({
    instructions: promptText,
    input: userMessage
  });

  const weeklyReportOutput = parseWeeklyReportJson(aiResponse.text);
  const schemaValidation = await validateWeeklyReportOutput(weeklyReportOutput);
  if (!schemaValidation.valid) {
    throw new WeeklyReportGenerationError(
      "WEEKLY_REPORT_SCHEMA_VALIDATION_FAILED",
      "AI weekly report response did not match weekly-report-output schema.",
      { errors: compactValidationErrors(schemaValidation.errors) }
    );
  }

  const consistencyValidation = validateWeeklyReportConsistency({
    weeklyReportOutput,
    macroReviewOutput
  });
  if (!consistencyValidation.valid) {
    throw new WeeklyReportGenerationError(
      "WEEKLY_REPORT_CONSISTENCY_FAILED",
      "AI weekly report response changed source macro-review facts.",
      { errors: consistencyValidation.errors }
    );
  }

  return weeklyReportOutput;
}

export {
  WeeklyReportGenerationError,
  buildWeeklyReportUserMessage,
  compactValidationErrors,
  generateWeeklyReport,
  parseWeeklyReportJson,
  validateWeeklyReportConsistency
};
