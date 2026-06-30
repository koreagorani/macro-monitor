import { loadIndicatorConfig } from "../src/config/load-config.js";
import { collectMarketPriceIndicator } from "../src/collectors/collect-market-price.js";
import { validateIndicatorOutput } from "../src/validation/validate-output.js";

const asOf = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const config = await loadIndicatorConfig();
const indicatorId = "us2y";
const indicator = config.indicators[indicatorId];
const apiKeyName = config.providerDefaults.apiKeyEnvironmentVariable;
const apiKey = process.env[apiKeyName];

const output = await collectMarketPriceIndicator({
  indicatorId,
  indicator,
  providerDefaults: config.providerDefaults,
  asOf,
  apiKey
});

const validation = await validateIndicatorOutput(output);
if (!validation.valid) {
  console.error(JSON.stringify({
    code: "SCHEMA_VALIDATION_FAILED",
    errors: validation.errors.map(({ instancePath, keyword, message }) => ({
      instancePath,
      keyword,
      message
    }))
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(output, null, 2));
  if (!output.available) process.exitCode = 1;
}
