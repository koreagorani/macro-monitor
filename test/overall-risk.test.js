import test from "node:test";
import assert from "node:assert/strict";

import { evaluateOverallRisk, calculateWeightedScore } from "../src/risk/evaluate-overall-risk.js";
import { validateRiskOutput } from "../src/validation/validate-risk-output.js";

function areaRisk(areaId, status, score, weight = 0.25) {
  return {
    areaId,
    name: areaId,
    weight,
    score,
    status,
    contributingIndicators: [],
    warnings: []
  };
}

const normalQuality = {
  shouldAbort: false,
  confidence: "normal",
  coreIndicatorIds: [],
  nonCoreIndicatorIds: [],
  failedCoreIndicators: [],
  failedNonCoreIndicators: [],
  availableIndicatorCount: 0,
  unavailableIndicatorCount: 0,
  warnings: []
};

test("overall risk evaluates normal when no alert area and at most one watch area", () => {
  const overallRisk = evaluateOverallRisk({
    quality: normalQuality,
    areaRisks: [
      areaRisk("rates_policy", "normal", 0, 0.35),
      areaRisk("inflation_supply", "normal", 0, 0.25),
      areaRisk("risk_appetite", "watch", 1, 0.30),
      areaRisk("dollar_korea", "normal", 0, 0.10)
    ]
  });

  assert.equal(overallRisk.level, "normal");
  assert.deepEqual(overallRisk.triggeredRules, ["NORMAL_NO_ALERT_AND_AT_MOST_ONE_WATCH"]);
});

test("overall risk evaluates watch for one alert area", () => {
  const overallRisk = evaluateOverallRisk({
    quality: normalQuality,
    areaRisks: [
      areaRisk("rates_policy", "alert", 2, 0.35),
      areaRisk("inflation_supply", "normal", 0, 0.25),
      areaRisk("risk_appetite", "normal", 0, 0.30),
      areaRisk("dollar_korea", "normal", 0, 0.10)
    ]
  });

  assert.equal(overallRisk.level, "watch");
  assert.deepEqual(overallRisk.triggeredRules, ["WATCH_ONE_AREA_ALERT"]);
});

test("overall risk evaluates watch for two watch areas", () => {
  const overallRisk = evaluateOverallRisk({
    quality: normalQuality,
    areaRisks: [
      areaRisk("rates_policy", "watch", 1, 0.35),
      areaRisk("inflation_supply", "watch", 1, 0.25),
      areaRisk("risk_appetite", "normal", 0, 0.30),
      areaRisk("dollar_korea", "normal", 0, 0.10)
    ]
  });

  assert.equal(overallRisk.level, "watch");
  assert.deepEqual(overallRisk.triggeredRules, ["WATCH_TWO_AREAS_WATCH"]);
});

test("overall risk evaluates alert for two distinct alert areas", () => {
  const overallRisk = evaluateOverallRisk({
    quality: normalQuality,
    areaRisks: [
      areaRisk("rates_policy", "alert", 2, 0.35),
      areaRisk("inflation_supply", "alert", 2, 0.25),
      areaRisk("risk_appetite", "normal", 0, 0.30),
      areaRisk("dollar_korea", "normal", 0, 0.10)
    ]
  });

  assert.equal(overallRisk.level, "alert");
  assert.deepEqual(overallRisk.triggeredRules, ["ALERT_TWO_DISTINCT_AREAS_ALERT"]);
});

test("overall risk evaluates alert when rates and risk appetite worsen together", () => {
  const overallRisk = evaluateOverallRisk({
    quality: normalQuality,
    areaRisks: [
      areaRisk("rates_policy", "watch", 1, 0.35),
      areaRisk("inflation_supply", "normal", 0, 0.25),
      areaRisk("risk_appetite", "watch", 1, 0.30),
      areaRisk("dollar_korea", "normal", 0, 0.10)
    ]
  });

  assert.equal(overallRisk.level, "alert");
  assert.deepEqual(overallRisk.triggeredRules, ["ALERT_RATES_AND_RISK_APPETITE_WORSENING"]);
});

test("overall risk evaluates high risk when rates, inflation, and risk appetite all worsen", () => {
  const overallRisk = evaluateOverallRisk({
    quality: normalQuality,
    areaRisks: [
      areaRisk("rates_policy", "watch", 1, 0.35),
      areaRisk("inflation_supply", "watch", 1, 0.25),
      areaRisk("risk_appetite", "watch", 1, 0.30),
      areaRisk("dollar_korea", "normal", 0, 0.10)
    ]
  });

  assert.equal(overallRisk.level, "high_risk");
  assert.deepEqual(overallRisk.triggeredRules, ["HIGH_RISK_RATES_INFLATION_RISK_APPETITE_WORSENING"]);
});

test("quality reduced is reflected in overall risk confidence", () => {
  const overallRisk = evaluateOverallRisk({
    quality: {
      ...normalQuality,
      confidence: "reduced"
    },
    areaRisks: [
      areaRisk("rates_policy", "normal", 0, 0.35),
      areaRisk("inflation_supply", "normal", 0, 0.25),
      areaRisk("risk_appetite", "normal", 0, 0.30),
      areaRisk("dollar_korea", "normal", 0, 0.10)
    ]
  });

  assert.equal(overallRisk.confidence, "reduced");
});

test("overall risk calculation is skipped when quality gate aborts", () => {
  const overallRisk = evaluateOverallRisk({
    quality: {
      ...normalQuality,
      shouldAbort: true,
      confidence: "aborted"
    },
    areaRisks: [areaRisk("rates_policy", "strong_alert", 3, 0.35)]
  });

  assert.equal(overallRisk, null);
});

test("weighted score uses enabled area weights as a normalized weighted average", () => {
  const score = calculateWeightedScore([
    areaRisk("rates_policy", "alert", 2, 0.35),
    areaRisk("inflation_supply", "watch", 1, 0.25),
    areaRisk("risk_appetite", "normal", 0, 0.30),
    areaRisk("dollar_korea", "normal", 0, 0.10)
  ]);

  assert.equal(score, 0.95);
});

test("risk output schema validates with populated overallRisk and allows null when aborted", async () => {
  const areaRisks = [
    areaRisk("rates_policy", "normal", 0, 0.35),
    areaRisk("inflation_supply", "normal", 0, 0.25),
    areaRisk("risk_appetite", "normal", 0, 0.30),
    areaRisk("dollar_korea", "normal", 0, 0.10)
  ];
  const overallRisk = evaluateOverallRisk({ quality: normalQuality, areaRisks });

  const validOutput = await validateRiskOutput({
    schemaVersion: "1.0.0",
    asOf: "2026-07-05",
    quality: normalQuality,
    indicatorStatuses: [],
    areaRisks,
    overallRisk,
    warnings: []
  });

  assert.equal(validOutput.valid, true);

  const abortedOutput = await validateRiskOutput({
    schemaVersion: "1.0.0",
    asOf: "2026-07-05",
    quality: {
      ...normalQuality,
      shouldAbort: true,
      confidence: "aborted"
    },
    indicatorStatuses: [],
    areaRisks: [],
    overallRisk: null,
    warnings: []
  });

  assert.equal(abortedOutput.valid, true);
});
