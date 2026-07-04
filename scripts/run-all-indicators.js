import { loadIndicatorConfig } from "../src/config/load-config.js";
import { collectAllIndicators } from "../src/collectors/collect-all-indicators.js";
import { validateIndicatorOutputs } from "../src/validation/validate-outputs.js";

const asOf = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const strict = process.env.STRICT_ALL_INDICATORS === "true";
const config = await loadIndicatorConfig();
const apiKey = process.env[config.providerDefaults.apiKeyEnvironmentVariable];

const outputs = await collectAllIndicators({
  indicators: config.indicators,
  providerDefaults: config.providerDefaults,
  asOf,
  apiKey
});

const validations = await validateIndicatorOutputs(outputs);
const invalid = validations.filter((result) => !result.valid);

if (invalid.length > 0) {
  for (const result of invalid) {
    console.error(JSON.stringify({
      indicatorId: result.indicatorId,
      code: "SCHEMA_VALIDATION_FAILED",
      errors: result.errors.map(({ instancePath, keyword, message }) => ({
        instancePath,
        keyword,
        message
      }))
    }, null, 2));
  }
} else {
  console.log(JSON.stringify(outputs, null, 2));
}

const unavailable = outputs.filter((output) => !output.available);
if (strict && unavailable.length > 0) {
  console.error(JSON.stringify({
    code: "STRICT_COLLECTION_FAILED",
    unavailableIndicatorIds: unavailable.map((output) => output.indicatorId)
  }, null, 2));
}

if (invalid.length > 0 || (strict && unavailable.length > 0)) {
  process.exitCode = 1;
}
