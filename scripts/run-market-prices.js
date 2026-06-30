import { loadIndicatorConfig } from "../src/config/load-config.js";
import { collectMarketPriceIndicators } from "../src/collectors/collect-market-prices.js";
import { validateIndicatorOutput } from "../src/validation/validate-output.js";

const asOf = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const strict = process.env.STRICT_MARKET_COLLECTION === "true";
const config = await loadIndicatorConfig();
const apiKeyName = config.providerDefaults.apiKeyEnvironmentVariable;
const apiKey = process.env[apiKeyName];

const outputs = await collectMarketPriceIndicators({
  indicators: config.indicators,
  providerDefaults: config.providerDefaults,
  asOf,
  apiKey
});

let schemaFailure = false;
for (const output of outputs) {
  const validation = await validateIndicatorOutput(output);
  if (!validation.valid) {
    schemaFailure = true;
    console.error(JSON.stringify({
      indicatorId: output.indicatorId,
      code: "SCHEMA_VALIDATION_FAILED",
      errors: validation.errors.map(({ instancePath, keyword, message }) => ({
        instancePath,
        keyword,
        message
      }))
    }, null, 2));
  }
}

if (!schemaFailure) {
  console.log(JSON.stringify(outputs, null, 2));
}

const unavailable = outputs.filter((output) => !output.available);
if (strict && unavailable.length > 0) {
  console.error(JSON.stringify({
    code: "STRICT_COLLECTION_FAILED",
    unavailableIndicatorIds: unavailable.map((output) => output.indicatorId)
  }, null, 2));
}

if (schemaFailure || (strict && unavailable.length > 0)) {
  process.exitCode = 1;
}
