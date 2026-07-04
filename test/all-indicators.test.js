import test from "node:test";
import assert from "node:assert/strict";

import { collectAllIndicators } from "../src/collectors/collect-all-indicators.js";

const indicators = {
  us2y: {
    name: "US 2Y",
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
  core_pce: {
    name: "Core PCE",
    type: "scheduled_release",
    source: { provider: "FRED", seriesId: "PCEPILFE", originalSource: "BEA" },
    unit: "% MoM",
    calculation: {
      threeMonthAveragePeriods: 3,
      consensusDefault: null
    }
  }
};

test("collects market and scheduled release indicators together", async () => {
  const fetchImpl = async (url) => {
    const seriesId = url.searchParams.get("series_id");
    const observations = seriesId === "PCEPILFE"
      ? [
          { date: "2026-01-01", value: "120.0" },
          { date: "2026-02-01", value: "120.3" },
          { date: "2026-03-01", value: "120.6" },
          { date: "2026-04-01", value: "121.2" }
        ]
      : [
          { date: "2026-05-01", value: "4.20" },
          { date: "2026-05-23", value: "4.30" },
          { date: "2026-05-30", value: "4.35" }
        ];

    return {
      ok: true,
      status: 200,
      async json() {
        return { observations };
      }
    };
  };

  const outputs = await collectAllIndicators({
    indicators,
    providerDefaults: {
      apiBaseUrl: "https://example.test/fred",
      fileType: "json"
    },
    asOf: "2026-05-31",
    apiKey: "test-key",
    fetchImpl
  });

  assert.deepEqual(outputs.map((output) => output.indicatorId), ["us2y", "core_pce"]);
  assert.equal(outputs.every((output) => output.available), true);
});
