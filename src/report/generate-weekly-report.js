import { readFile } from "node:fs/promises";

import { validateWeeklyAnalysisOutput } from "../validation/validate-weekly-analysis-output.js";
import { validateWeeklyReportOutput } from "../validation/validate-weekly-report-output.js";
import { buildWeeklyReportOutput } from "./build-weekly-report-output.js";
import {
  validateWeeklyAnalysisConsistency,
  validateWeeklyReportConsistency
} from "./validate-report-consistency.js";

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
    "아래 deterministic reportFacts만 해석해 weekly-analysis-output JSON을 생성해줘.",
    "",
    "절대 규칙:",
    "- 숫자, 날짜, 단위, 상태, 점수, 임계값을 출력하지 마라.",
    "- 위험 등급을 재판정하지 마라.",
    "- area/theme/candidate의 canonical 이름을 생성하지 마라.",
    "- areaInsights와 themeInsights는 입력에 있는 ID를 정확히 한 번씩 참조하라.",
    "- hedge candidate는 입력에 있는 candidateId만 참조하라.",
    "- 입력에 없는 최신 뉴스, 가격, 일정을 만들지 마라.",
    "- 특정 종목 추천을 하지 마라.",
    "- 실제 개인 보유 수량이나 평가금액을 추정하지 마라.",
    "- JSON 외 텍스트를 출력하지 마라.",
    "",
    "reportFacts:",
    JSON.stringify(macroReviewOutput.reportFacts, null, 2)
  ].join("\n");
}

function buildWeeklyReportResponseFormat(schema) {
  const apiSchema = JSON.parse(JSON.stringify(schema));
  delete apiSchema.$schema;
  delete apiSchema.$id;

  return {
    type: "json_schema",
    name: "weekly_analysis_output",
    strict: true,
    schema: apiSchema
  };
}

function parseWeeklyReportJson(rawText) {
  try {
    return JSON.parse(rawText.trim());
  } catch (error) {
    throw new WeeklyReportGenerationError(
      "WEEKLY_ANALYSIS_JSON_PARSE_FAILED",
      "AI weekly analysis response was not valid JSON.",
      { cause: error }
    );
  }
}

async function generateWeeklyReport({
  macroReviewOutput,
  openaiClient,
  promptPath = "prompts/weekly-analysis.md",
  schemaPath = "data/schema/weekly-analysis-output.schema.json",
  generatedAt = new Date().toISOString()
}) {
  if (!macroReviewOutput.reportFacts) {
    throw new WeeklyReportGenerationError(
      "WEEKLY_REPORT_FACTS_UNAVAILABLE",
      "Weekly analysis cannot run without deterministic report facts."
    );
  }

  const [promptText, schemaText] = await Promise.all([
    readFile(promptPath, "utf8"),
    readFile(schemaPath, "utf8")
  ]);
  const responseFormat = buildWeeklyReportResponseFormat(JSON.parse(schemaText));
  const userMessage = buildWeeklyReportUserMessage(macroReviewOutput);

  const aiResponse = await openaiClient.createResponse({
    instructions: promptText,
    input: userMessage,
    responseFormat
  });

  const analysis = parseWeeklyReportJson(aiResponse.text);
  const analysisSchemaValidation = await validateWeeklyAnalysisOutput(analysis);
  if (!analysisSchemaValidation.valid) {
    throw new WeeklyReportGenerationError(
      "WEEKLY_ANALYSIS_SCHEMA_VALIDATION_FAILED",
      "AI weekly analysis response did not match weekly-analysis-output schema.",
      { errors: compactValidationErrors(analysisSchemaValidation.errors) }
    );
  }

  const analysisConsistency = validateWeeklyAnalysisConsistency({
    analysis,
    reportFacts: macroReviewOutput.reportFacts
  });
  if (!analysisConsistency.valid) {
    throw new WeeklyReportGenerationError(
      "WEEKLY_ANALYSIS_CONSISTENCY_FAILED",
      "AI weekly analysis referenced inconsistent source fact IDs.",
      { errors: analysisConsistency.errors }
    );
  }

  const weeklyReportOutput = buildWeeklyReportOutput({
    macroReviewOutput,
    analysis,
    generatedAt
  });
  const finalSchemaValidation = await validateWeeklyReportOutput(weeklyReportOutput);
  if (!finalSchemaValidation.valid) {
    throw new WeeklyReportGenerationError(
      "WEEKLY_REPORT_SCHEMA_VALIDATION_FAILED",
      "Code-assembled weekly report did not match weekly-report-output schema.",
      { errors: compactValidationErrors(finalSchemaValidation.errors) }
    );
  }

  const finalConsistency = validateWeeklyReportConsistency({
    weeklyReportOutput,
    macroReviewOutput
  });
  if (!finalConsistency.valid) {
    throw new WeeklyReportGenerationError(
      "WEEKLY_REPORT_CONSISTENCY_FAILED",
      "Code-assembled weekly report changed source macro-review facts.",
      { errors: finalConsistency.errors }
    );
  }

  return weeklyReportOutput;
}

export {
  WeeklyReportGenerationError,
  buildWeeklyReportResponseFormat,
  buildWeeklyReportUserMessage,
  compactValidationErrors,
  generateWeeklyReport,
  parseWeeklyReportJson,
  validateWeeklyReportConsistency
};
