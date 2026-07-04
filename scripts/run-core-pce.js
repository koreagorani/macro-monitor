import { loadIndicatorConfig } from "../src/config/load-config.js";
import { collectScheduledReleaseIndicator } from "../src/collectors/collect-scheduled-release.js";
import { validateIndicatorOutput } from "../src/validation/validate-output.js";

const asOf = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const config = await loadIndicatorConfig();
const indicatorId = "core_pce";
const indicator = config.indicators[indicatorId];
const apiKey = process.env[config.providerDefaults.apiKeyEnvironmentVariable];

const output = await collectScheduledReleaseIndicator({
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
  if (!output.available) {
    process.exitCode = 1;
  }
}
