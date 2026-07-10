import { loadJsonFile } from "../src/config/load-config.js";
import { validateIndicatorOutput } from "../src/validation/validate-output.js";
import { validateRiskOutput } from "../src/validation/validate-risk-output.js";
import { validatePortfolioVulnerabilityOutput } from "../src/validation/validate-portfolio-vulnerability-output.js";
import { validateMacroReviewOutput } from "../src/validation/validate-macro-review-output.js";

const indicatorExamplePaths = [
  "data/examples/market-price.example.json",
  "data/examples/scheduled-release.example.json"
];

const riskOutputExamplePaths = [
  "data/examples/risk-output.example.json"
];

const portfolioVulnerabilityExamplePaths = [
  "data/examples/portfolio-vulnerability.example.json"
];

const macroReviewExamplePaths = [
  "data/examples/macro-review.example.json"
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

for (const path of portfolioVulnerabilityExamplePaths) {
  const value = await loadJsonFile(path);
  const result = await validatePortfolioVulnerabilityOutput(value);
  if (!result.valid) {
    failed = true;
    console.error(`${path}: invalid`);
    console.error(JSON.stringify(result.errors, null, 2));
  } else {
    console.log(`${path}: valid`);
  }
}

for (const path of macroReviewExamplePaths) {
  const value = await loadJsonFile(path);
  const result = await validateMacroReviewOutput(value);
  if (!result.valid) {
    failed = true;
    console.error(`${path}: invalid`);
    console.error(JSON.stringify(result.errors, null, 2));
  } else {
    console.log(`${path}: valid`);
  }
}

if (failed) process.exitCode = 1;
