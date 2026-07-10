import { loadJsonFile } from "../src/config/load-config.js";
import { validateIndicatorOutput } from "../src/validation/validate-output.js";
import { validateRiskOutput } from "../src/validation/validate-risk-output.js";

const indicatorExamplePaths = [
  "data/examples/market-price.example.json",
  "data/examples/scheduled-release.example.json"
];

const riskOutputExamplePaths = [
  "data/examples/risk-output.example.json"
];

let failed = false;

for (const path of indicatorExamplePaths) {
  const value = await loadJsonFile(path);
  const result = await validateIndicatorOutput(value);
  if (!result.valid) {
    failed = true;
    console.error(`${path}: invalid`);
    console.error(JSON.stringify(result.errors, null, 2));
  } else {
    console.log(`${path}: valid`);
  }
}

for (const path of riskOutputExamplePaths) {
  const value = await loadJsonFile(path);
  const result = await validateRiskOutput(value);
  if (!result.valid) {
    failed = true;
    console.error(`${path}: invalid`);
    console.error(JSON.stringify(result.errors, null, 2));
  } else {
    console.log(`${path}: valid`);
  }
}

if (failed) process.exitCode = 1;
