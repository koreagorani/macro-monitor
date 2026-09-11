import assert from "node:assert/strict";
import test from "node:test";

import {
  EMPTY_VALUE,
  formatBasisPointChange,
  formatCorePceValue,
  formatDate,
  formatIndicatorChange,
  formatIndicatorCurrentValue,
  formatPercentageChange,
  formatScore
} from "../src/report/format-report-value.js";

test("formatIndicatorCurrentValue applies indicator-specific precision and units", () => {
  assert.equal(formatIndicatorCurrentValue({ indicatorId: "us2y", currentValue: 4.126, unit: "%" }), "4.13%");
  assert.equal(formatIndicatorCurrentValue({ indicatorId: "wti", currentValue: 78.44, unit: "USD/barrel" }), "78.4 USD/barrel");
  assert.equal(formatIndicatorCurrentValue({ indicatorId: "usdkrw", currentValue: 1382.53, unit: "KRW/USD" }), "1,382.5 KRW/USD");
  assert.equal(formatIndicatorCurrentValue({ indicatorId: "btc", currentValue: 118420.49, unit: "USD" }), "118,420 USD");
  assert.equal(formatIndicatorCurrentValue({ indicatorId: "sp500", currentValue: 6370.24, unit: "index" }), "6,370.2 index");
});

test("formatters apply bp, signed percentage, Core PCE, score and date policies", () => {
  assert.equal(formatBasisPointChange(12.44), "+12.4bp");
  assert.equal(formatIndicatorChange(-8.64, "bp"), "-8.6bp");
  assert.equal(formatPercentageChange(4.18), "+4.2%");
  assert.equal(formatPercentageChange(-1.24), "-1.2%");
  assert.equal(formatCorePceValue(0.226, "% MoM"), "0.23% MoM");
  assert.equal(formatScore(0.778571428571), "0.78");
  assert.equal(formatScore(1.7142857142857144), "1.71");
  assert.equal(formatDate("2026-07-03"), "2026-07-03");
});

test("percentage formatter keeps a second decimal when one-decimal rounding would erase a non-zero move", () => {
  assert.equal(formatPercentageChange(0.04), "+0.04%");
  assert.equal(formatPercentageChange(-0.04), "-0.04%");
  assert.equal(formatPercentageChange(0), "0.0%");
});

test("display formatters map null, undefined and non-finite values to an em dash", () => {
  for (const value of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(formatScore(value), EMPTY_VALUE);
    assert.equal(formatPercentageChange(value), EMPTY_VALUE);
    assert.equal(formatCorePceValue(value), EMPTY_VALUE);
  }
  assert.equal(formatIndicatorCurrentValue({ indicatorId: "wti", currentValue: null, unit: "USD/barrel" }), EMPTY_VALUE);
  assert.equal(formatDate(null), EMPTY_VALUE);
});
