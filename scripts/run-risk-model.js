import { loadIndicatorConfig, loadJsonFile } from "../src/config/load-config.js";
import { collectAllIndicators } from "../src/collectors/collect-all-indicators.js";
import { evaluateQualityGate } from "../src/risk/quality-gate.js";
import { evaluateIndicatorStatuses } from "../src/risk/evaluate-indicator.js";
import { aggregateAreaRisks } from "../src/risk/aggregate-areas.js";
import { validateIndicatorOutputs } from "../src/validation/validate-outputs.js";
import { validateRiskOutput } from "../src/validation/validate-risk-output.js";

const asOf = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const indicatorConfig = await loadIndicatorConfig();
const thresholdsConfig = await loadJsonFile("config/thresholds.json");
const riskAreasConfig = await loadJsonFile("config/risk-areas.json");
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

const areaWarnings = areaRisks.flatMap((areaRisk) => areaRisk.warnings);
const warnings = [...quality.warnings, ...schemaWarnings, ...areaWarnings];

const riskOutput = {
  schemaVersion: "1.0.0",
  asOf,
  quality: {
    ...quality,
    warnings: [...quality.warnings, ...schemaWarnings]
  },
  indicatorStatuses,
  areaRisks,
  overallRisk: null,
  warnings
};

const validation = await validateRiskOutput(riskOutput);

if (!validation.valid) {
  console.error(JSON.stringify({
    code: "RISK_OUTPUT_SCHEMA_VALIDATION_FAILED",
    errors: validation.errors.map(({ instancePath, keyword, message }) => ({
      instancePath,
      keyword,
      message
    }))
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(riskOutput, null, 2));
}
