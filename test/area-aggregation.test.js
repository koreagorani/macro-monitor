import test from "node:test";
import assert from "node:assert/strict";

import { loadJsonFile } from "../src/config/load-config.js";
import { aggregateAreaRisks, classifyAreaStatus } from "../src/risk/aggregate-areas.js";
import { validateRiskOutput } from "../src/validation/validate-risk-output.js";

const riskAreasConfig = await loadJsonFile("config/risk-areas.json");

function close(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} is not close to ${expected}`);
}

function status(indicatorId, score, statusValue = "normal", available = true) {
  return {
    indicatorId,
    available,
    status: available ? statusValue : "unavailable",
    score: available ? score : null,
    selectedEvaluation: available
      ? {
          metricPath: "metrics.weeklyChange",
          unit: "%",
          value: score,
          status: statusValue,
          score,
          matchedRuleId: `${indicatorId}_test_rule`,
          signal: null
        }
      : null,
    evaluations: [],
    warnings: []
  };
}

function area(areaRisks, areaId) {
  return areaRisks.find((areaRisk) => areaRisk.areaId === areaId);
}

test("core PCE contributes 60/40 across rates and inflation areas", () => {
  const areaRisks = aggregateAreaRisks({
    riskAreasConfig,
    indicatorStatuses: [
      status("us2y", 0, "normal"),
      status("core_pce", 2, "alert"),
      status("wti", 0, "normal"),
      status("usdkrw", 0, "normal"),
      status("sp500", 0, "normal"),
      status("btc", 0, "normal")
    ]
  });

  close(area(areaRisks, "rates_policy").score, (0 * 1 + 2 * 0.6) / 1.6);
  close(area(areaRisks, "inflation_supply").score, (0 * 1 + 2 * 0.4) / 1.4);

  const ratesCorePce = area(areaRisks, "rates_policy").contributingIndicators
    .find((item) => item.indicatorId === "core_pce");
  const inflationCorePce = area(areaRisks, "inflation_supply").contributingIndicators
    .find((item) => item.indicatorId === "core_pce");

  assert.equal(ratesCorePce.areaWeight, 0.6);
  assert.equal(inflationCorePce.areaWeight, 0.4);
});

test("risk appetite uses simple average for S&P 500 and BTC in MVP", () => {
  const areaRisks = aggregateAreaRisks({
    riskAreasConfig,
    indicatorStatuses: [
      status("sp500", 2, "alert"),
      status("btc", 0, "normal")
    ]
  });

  close(area(areaRisks, "risk_appetite").score, 1);
});

test("disabled areas are excluded", () => {
  const areaRisks = aggregateAreaRisks({
    riskAreasConfig,
    indicatorStatuses: [status("us2y", 1, "watch")]
  });

  assert.equal(area(areaRisks, "future_liquidity_fiscal"), undefined);
});

test("unavailable indicators are excluded from area score and warned", () => {
  const areaRisks = aggregateAreaRisks({
    riskAreasConfig,
    indicatorStatuses: [
      status("sp500", 2, "alert"),
      status("btc", null, "unavailable", false)
    ]
  });

  const riskAppetite = area(areaRisks, "risk_appetite");
  close(riskAppetite.score, 2);
  assert.deepEqual(riskAppetite.contributingIndicators.map((item) => item.indicatorId), ["sp500"]);
  assert.equal(riskAppetite.warnings[0].code, "AREA_INDICATOR_EXCLUDED");
  assert.equal(riskAppetite.warnings[0].indicatorId, "btc");
});

test("area status classification follows MVP score bands", () => {
  assert.equal(classifyAreaStatus(-0.1), "easing");
  assert.equal(classifyAreaStatus(0), "normal");
  assert.equal(classifyAreaStatus(0.5), "watch");
  assert.equal(classifyAreaStatus(1.5), "alert");
  assert.equal(classifyAreaStatus(2.5), "strong_alert");
});

test("risk output schema validates with populated area risks", async () => {
  const indicatorStatuses = [
    status("us2y", 0, "normal"),
    status("core_pce", 2, "alert"),
    status("wti", 1, "watch"),
    status("usdkrw", 0, "normal"),
    status("sp500", 2, "alert"),
    status("btc", 0, "normal")
  ];
  const areaRisks = aggregateAreaRisks({ riskAreasConfig, indicatorStatuses });

  const validation = await validateRiskOutput({
    schemaVersion: "1.0.0",
    asOf: "2026-07-05",
    quality: {
      shouldAbort: false,
      confidence: "normal",
      coreIndicatorIds: riskAreasConfig.coreIndicators,
      nonCoreIndicatorIds: riskAreasConfig.nonCoreIndicators,
      failedCoreIndicators: [],
      failedNonCoreIndicators: [],
      availableIndicatorCount: 6,
      unavailableIndicatorCount: 0,
      warnings: []
    },
    indicatorStatuses,
    areaRisks,
    overallRisk: null,
    warnings: []
  });

  assert.equal(validation.valid, true);
});
