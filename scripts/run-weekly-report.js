import { pathToFileURL } from "node:url";
import { loadIndicatorConfig, loadJsonFile } from "../src/config/load-config.js";
import { collectAllIndicators } from "../src/collectors/collect-all-indicators.js";
import { evaluateQualityGate } from "../src/risk/quality-gate.js";
import { evaluateIndicatorStatuses } from "../src/risk/evaluate-indicator.js";
import { aggregateAreaRisks } from "../src/risk/aggregate-areas.js";
import { evaluateOverallRisk } from "../src/risk/evaluate-overall-risk.js";
import { evaluatePortfolioVulnerability } from "../src/portfolio/evaluate-portfolio-vulnerability.js";
import {
  parseHeldThemeIds,
  PortfolioProfileError
} from "../src/portfolio/parse-held-theme-ids.js";
import { buildMacroReviewOutput } from "../src/review/build-macro-review-output.js";
import { buildReportFacts } from "../src/report/build-report-facts.js";
import { validateReportFactsConsistency } from "../src/report/validate-report-consistency.js";
import { createOpenAIClientFromEnv, OpenAIClientError } from "../src/clients/openai-client.js";
import { generateWeeklyReport, WeeklyReportGenerationError } from "../src/report/generate-weekly-report.js";
import { validateIndicatorOutputs } from "../src/validation/validate-outputs.js";
import { validateRiskOutput } from "../src/validation/validate-risk-output.js";
import { validatePortfolioVulnerabilityOutput } from "../src/validation/validate-portfolio-vulnerability-output.js";
import { validateMacroReviewOutput } from "../src/validation/validate-macro-review-output.js";
import { validateReportFacts } from "../src/validation/validate-report-facts.js";
import { validateWeeklyReportOutput } from "../src/validation/validate-weekly-report-output.js";

function compactErrors(errors = []) {
  return errors.map(({ instancePath, keyword, message }) => ({
    instancePath,
    keyword,
    message
  }));
}

function fail({ code, message, errors = [] }) {
  console.error(JSON.stringify({
    code,
    message,
    errors
  }, null, 2));
  process.exitCode = 1;
}

function loadHeldThemeIds(portfolioThemesConfig) {
  try {
    return parseHeldThemeIds({
      rawValue: process.env.PORTFOLIO_HELD_THEME_IDS,
      portfolioThemesConfig
    });
  } catch (error) {
    if (error instanceof PortfolioProfileError) {
      throw new WeeklyReportGenerationError(error.code, error.message);
    }
    throw error;
  }
}

async function buildMacroReview({ asOf }) {
  const indicatorConfig = await loadIndicatorConfig();
  const thresholdsConfig = await loadJsonFile("config/thresholds.json");
  const riskAreasConfig = await loadJsonFile("config/risk-areas.json");
  const portfolioThemesConfig = await loadJsonFile("config/portfolio-themes.json");
  const hedgeCandidatesConfig = await loadJsonFile("config/hedge-candidates.json");
  const apiKey = process.env[indicatorConfig.providerDefaults.apiKeyEnvironmentVariable];

  const indicatorOutputs = await collectAllIndicators({
    indicators: indicatorConfig.indicators,
    providerDefaults: indicatorConfig.providerDefaults,
    asOf,
    apiKey
  });

  const indicatorValidations = await validateIndicatorOutputs(indicatorOutputs);
  const invalidIndicatorOutputs = indicatorValidations.filter((result) => !result.valid);
  const schemaWarnings = invalidIndicatorOutputs.map((result) => ({
    code: "INDICATOR_SCHEMA_VALIDATION_FAILED",
    indicatorId: result.indicatorId,
    message: `${result.indicatorId} failed indicator output schema validation.`
  }));

  const quality = evaluateQualityGate({
    indicatorOutputs,
    riskAreasConfig
  });

  const indicatorStatuses = quality.shouldAbort
    ? []
    : evaluateIndicatorStatuses({
        indicatorOutputs,
        thresholdsConfig
      });

  const areaRisks = quality.shouldAbort
    ? []
    : aggregateAreaRisks({
        indicatorStatuses,
        riskAreasConfig
      });

  const overallRisk = quality.shouldAbort
    ? null
    : evaluateOverallRisk({
        areaRisks,
        quality
      });

  const areaWarnings = areaRisks.flatMap((areaRisk) => areaRisk.warnings);
  const riskWarnings = [...quality.warnings, ...schemaWarnings, ...areaWarnings];

  const riskOutput = {
    schemaVersion: "1.0.0",
    asOf,
    quality: {
      ...quality,
      warnings: [...quality.warnings, ...schemaWarnings]
    },
    indicatorStatuses,
    areaRisks,
    overallRisk,
    warnings: riskWarnings
  };

  const riskValidation = await validateRiskOutput(riskOutput);
  if (!riskValidation.valid) {
    throw new WeeklyReportGenerationError(
      "RISK_OUTPUT_SCHEMA_VALIDATION_FAILED",
      "Risk output failed schema validation before weekly report generation.",
      { errors: compactErrors(riskValidation.errors) }
    );
  }

  const portfolioVulnerability = riskOutput.quality.shouldAbort
    ? null
    : evaluatePortfolioVulnerability({
        riskOutput,
        portfolioThemesConfig,
        hedgeCandidatesConfig,
        heldThemeIds: loadHeldThemeIds(portfolioThemesConfig)
      });

  if (portfolioVulnerability !== null) {
    const portfolioValidation = await validatePortfolioVulnerabilityOutput(portfolioVulnerability);
    if (!portfolioValidation.valid) {
      throw new WeeklyReportGenerationError(
        "PORTFOLIO_VULNERABILITY_OUTPUT_SCHEMA_VALIDATION_FAILED",
        "Portfolio vulnerability output failed schema validation before weekly report generation.",
        { errors: compactErrors(portfolioValidation.errors) }
      );
    }
  }

  const reportFacts = buildReportFacts({
    indicatorOutputs,
    riskOutput,
    portfolioVulnerability,
    indicatorConfig,
    thresholdsConfig
  });

  if (reportFacts !== null) {
    const reportFactsValidation = await validateReportFacts(reportFacts);
    if (!reportFactsValidation.valid) {
      throw new WeeklyReportGenerationError(
        "REPORT_FACTS_SCHEMA_VALIDATION_FAILED",
        "Deterministic report facts failed schema validation.",
        { errors: compactErrors(reportFactsValidation.errors) }
      );
    }

    const reportFactsConsistency = validateReportFactsConsistency({
      reportFacts,
      indicatorOutputs,
      riskOutput,
      portfolioVulnerability,
      indicatorConfig,
      riskAreasConfig,
      thresholdsConfig
    });
    if (!reportFactsConsistency.valid) {
      throw new WeeklyReportGenerationError(
        "REPORT_FACTS_CONSISTENCY_FAILED",
        "Deterministic report facts did not match source outputs and config.",
        { errors: reportFactsConsistency.errors }
      );
    }
  }

  const macroReviewOutput = buildMacroReviewOutput({
    riskOutput,
    portfolioVulnerability,
    reportFacts
  });

  const macroReviewValidation = await validateMacroReviewOutput(macroReviewOutput);
  if (!macroReviewValidation.valid) {
    throw new WeeklyReportGenerationError(
      "MACRO_REVIEW_OUTPUT_SCHEMA_VALIDATION_FAILED",
      "Macro review output failed schema validation before weekly report generation.",
      { errors: compactErrors(macroReviewValidation.errors) }
    );
  }

  return macroReviewOutput;
}

async function generateLiveWeeklyReport({ asOf }) {
  const macroReviewOutput = await buildMacroReview({ asOf });
  const openaiClient = createOpenAIClientFromEnv();
  const weeklyReportOutput = await generateWeeklyReport({
    macroReviewOutput,
    openaiClient
  });

  const weeklyReportValidation = await validateWeeklyReportOutput(weeklyReportOutput);
  if (!weeklyReportValidation.valid) {
    throw new WeeklyReportGenerationError(
      "WEEKLY_REPORT_OUTPUT_SCHEMA_VALIDATION_FAILED",
      "Weekly report output failed final schema validation.",
      { errors: compactErrors(weeklyReportValidation.errors) }
    );
  }

  return weeklyReportOutput;
}

async function main() {
  try {
    const asOf = process.argv[2] ?? new Date().toISOString().slice(0, 10);
    const weeklyReportOutput = await generateLiveWeeklyReport({ asOf });
    console.log(JSON.stringify(weeklyReportOutput, null, 2));
  } catch (error) {
    if (error instanceof OpenAIClientError || error instanceof WeeklyReportGenerationError) {
      fail({
        code: error.code,
        message: error.message,
        errors: error.errors ?? []
      });
    } else {
      fail({
        code: "WEEKLY_REPORT_GENERATION_UNEXPECTED_ERROR",
        message: "Weekly report generation failed unexpectedly."
      });
    }
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  await main();
}

export {
  buildMacroReview,
  compactErrors,
  generateLiveWeeklyReport
};
