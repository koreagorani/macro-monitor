import { loadIndicatorConfig, loadJsonFile } from "../src/config/load-config.js";
import { collectAllIndicators } from "../src/collectors/collect-all-indicators.js";
import { evaluateQualityGate } from "../src/risk/quality-gate.js";
import { evaluateIndicatorStatuses } from "../src/risk/evaluate-indicator.js";
import { aggregateAreaRisks } from "../src/risk/aggregate-areas.js";
import { evaluateOverallRisk } from "../src/risk/evaluate-overall-risk.js";
import { evaluatePortfolioVulnerability } from "../src/portfolio/evaluate-portfolio-vulnerability.js";
import { buildMacroReviewOutput } from "../src/review/build-macro-review-output.js";
import { validateIndicatorOutputs } from "../src/validation/validate-outputs.js";
import { validateRiskOutput } from "../src/validation/validate-risk-output.js";
import { validatePortfolioVulnerabilityOutput } from "../src/validation/validate-portfolio-vulnerability-output.js";
import { validateMacroReviewOutput } from "../src/validation/validate-macro-review-output.js";

function compactErrors(errors) {
  return errors.map(({ instancePath, keyword, message }) => ({
    instancePath,
    keyword,
    message
  }));
}

const asOf = process.argv[2] ?? new Date().toISOString().slice(0, 10);
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
  console.error(JSON.stringify({
    code: "RISK_OUTPUT_SCHEMA_VALIDATION_FAILED",
    errors: compactErrors(riskValidation.errors)
  }, null, 2));
  process.exitCode = 1;
} else {
  const portfolioVulnerability = riskOutput.quality.shouldAbort
    ? null
    : evaluatePortfolioVulnerability({
        riskOutput,
        portfolioThemesConfig,
        hedgeCandidatesConfig
      });

  if (portfolioVulnerability !== null) {
    const portfolioValidation = await validatePortfolioVulnerabilityOutput(portfolioVulnerability);
    if (!portfolioValidation.valid) {
      console.error(JSON.stringify({
        code: "PORTFOLIO_VULNERABILITY_OUTPUT_SCHEMA_VALIDATION_FAILED",
        errors: compactErrors(portfolioValidation.errors)
      }, null, 2));
      process.exitCode = 1;
    }
  }

  if (!process.exitCode) {
    const macroReviewOutput = buildMacroReviewOutput({
      riskOutput,
      portfolioVulnerability
    });

    const macroReviewValidation = await validateMacroReviewOutput(macroReviewOutput);
    if (!macroReviewValidation.valid) {
      console.error(JSON.stringify({
        code: "MACRO_REVIEW_OUTPUT_SCHEMA_VALIDATION_FAILED",
        errors: compactErrors(macroReviewValidation.errors)
      }, null, 2));
      process.exitCode = 1;
    } else {
      console.log(JSON.stringify(macroReviewOutput, null, 2));
    }
  }
}
