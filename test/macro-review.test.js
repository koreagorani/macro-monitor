import test from "node:test";
import assert from "node:assert/strict";

import { buildMacroReviewOutput } from "../src/review/build-macro-review-output.js";
import { validateMacroReviewOutput } from "../src/validation/validate-macro-review-output.js";
import { buildReportV2Fixture } from "../test-support/report-v2-fixture.js";

const fixture = await buildReportV2Fixture();
const { riskOutput, portfolioVulnerability, reportFacts } = fixture;

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function collectKeys(value, keys = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return keys;
  }

  if (value !== null && typeof value === "object") {
    for (const [key, nestedValue] of Object.entries(value)) {
      keys.push(key);
      collectKeys(nestedValue, keys);
    }
  }

  return keys;
}

test("macro review output contains risk output and portfolio vulnerability in normal flow", async () => {
  const output = buildMacroReviewOutput({
    riskOutput,
    portfolioVulnerability,
    reportFacts,
    generatedAt: "2026-07-05T00:00:00.000Z"
  });

  assert.equal(output.schemaVersion, "2.0.0");
  assert.equal(output.riskOutput.asOf, "2026-07-05");
  assert.equal(output.portfolioVulnerability.asOf, "2026-07-05");
  assert.equal(output.dataSourceSummary.portfolioVulnerabilityCalculated, true);
  assert.equal(output.dataSourceSummary.riskShouldAbort, false);
  assert.deepEqual(output.reportFacts, reportFacts);

  const validation = await validateMacroReviewOutput(output);
  assert.equal(validation.valid, true);
});

test("macro review skips portfolio vulnerability when risk quality aborts", async () => {
  const abortedRiskOutput = deepClone(riskOutput);
  abortedRiskOutput.quality.shouldAbort = true;
  abortedRiskOutput.quality.confidence = "aborted";
  abortedRiskOutput.indicatorStatuses = [];
  abortedRiskOutput.areaRisks = [];
  abortedRiskOutput.overallRisk = null;

  const output = buildMacroReviewOutput({
    riskOutput: abortedRiskOutput,
    portfolioVulnerability: null,
    generatedAt: "2026-07-05T00:00:00.000Z"
  });

  assert.equal(output.portfolioVulnerability, null);
  assert.equal(output.reportFacts, null);
  assert.equal(output.dataSourceSummary.portfolioVulnerabilityCalculated, false);
  assert.equal(output.warnings[0].code, "MACRO_REVIEW_PORTFOLIO_SKIPPED");

  const validation = await validateMacroReviewOutput(output);
  assert.equal(validation.valid, true);
});

test("macro review propagates reduced confidence as warning", () => {
  const reducedRiskOutput = deepClone(riskOutput);
  reducedRiskOutput.quality.confidence = "reduced";
  const reducedReportFacts = deepClone(reportFacts);
  reducedReportFacts.overallRisk.confidence = "reduced";
  reducedReportFacts.portfolioThemes.forEach((theme) => {
    theme.confidence = "reduced";
  });

  const output = buildMacroReviewOutput({
    riskOutput: reducedRiskOutput,
    portfolioVulnerability,
    reportFacts: reducedReportFacts,
    generatedAt: "2026-07-05T00:00:00.000Z"
  });

  assert.equal(output.dataSourceSummary.riskQualityConfidence, "reduced");
  assert.ok(output.warnings.some((warning) => warning.code === "MACRO_REVIEW_REDUCED_CONFIDENCE"));
});

test("macro review output does not expose personal holding quantities or account values", () => {
  const output = buildMacroReviewOutput({
    riskOutput,
    portfolioVulnerability,
    reportFacts,
    generatedAt: "2026-07-05T00:00:00.000Z"
  });
  const forbiddenKeys = new Set([
    "quantity",
    "quantities",
    "shares",
    "marketValue",
    "accountValue",
    "positionValue",
    "valuation",
    "costBasis"
  ]);

  const keys = collectKeys(output);
  const foundForbiddenKeys = keys.filter((key) => forbiddenKeys.has(key));

  assert.deepEqual(foundForbiddenKeys, []);
});
