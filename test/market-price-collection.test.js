import test from "node:test";
import assert from "node:assert/strict";

import { calculateMarketPriceMetrics } from "../src/domain/market-price.js";
import { collectMarketPriceIndicators } from "../src/collectors/collect-market-prices.js";

const percentObservations = [
  { date: "2026-05-01", value: "100" },
  { date: "2026-05-23", value: "105" },
  { date: "2026-05-30", value: "110" }
];

function assertCloseTo(actual, expected, tolerance = 1e-10) {
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

test("calculates weekly and four-week percent changes", () => {
  const metrics = calculateMarketPriceMetrics({
    observations: percentObservations,
    asOf: "2026-05-31",
    calculation: {
      method: "percent_change",
      weeklyLookbackDays: 7,
      fourWeekLookbackDays: 28,
      changeUnit: "%"
    }
  });

  assertCloseTo(metrics.weeklyChange, (110 / 105 - 1) * 100);
  assertCloseTo(metrics.fourWeekChange, 10);
  assert.equal(metrics.weeklyChangeUnit, "%");
  assert.equal(metrics.fourWeekChangeUnit, "%");
});

test("collects market indicators independently when one provider request fails", async () => {
  const indicators = {
    us2y: {
      name: "미국 2년물 국채금리",
      type: "market_price",
      source: { provider: "FRED", seriesId: "DGS2", originalSource: "H.15" },
      unit: "%",
      calculation: {
        method: "basis_point_difference",
        weeklyLookbackDays: 7,
        fourWeekLookbackDays: 28,
        changeUnit: "bp",
        percentagePointToBasisPoint: 100
      }
    },
    wti: {
      name: "WTI",
      type: "market_price",
      source: { provider: "FRED", seriesId: "DCOILWTICO", originalSource: "EIA" },
      unit: "USD/barrel",
      calculation: {
        method: "percent_change",
        weeklyLookbackDays: 7,
        fourWeekLookbackDays: 28,
        changeUnit: "%"
      }
    }
  };

  const fetchImpl = async (url) => {
    const seriesId = url.searchParams.get("series_id");
    if (seriesId === "DCOILWTICO") {
      return { ok: false, status: 503 };
    }

    return {
      ok: true,
      status: 200,
      async json() {
        return { observations: [
          { date: "2026-05-01", value: "4.20" },
          { date: "2026-05-23", value: "4.30" },
          { date: "2026-05-30", value: "4.35" }
        ] };
      }
    };
  };

  const outputs = await collectMarketPriceIndicators({
    indicators,
    providerDefaults: {
      apiBaseUrl: "https://example.test/fred",
      fileType: "json"
    },
    asOf: "2026-05-31",
    apiKey: "test-key",
    fetchImpl
  });

  assert.equal(outputs.length, 2);
  assert.equal(outputs[0].indicatorId, "us2y");
  assert.equal(outputs[0].available, true);
  assert.equal(outputs[1].indicatorId, "wti");
  assert.equal(outputs[1].available, false);
  assert.equal(outputs[1].error.code, "HTTP_ERROR");
  assert.equal(outputs[1].metrics, null);
});
