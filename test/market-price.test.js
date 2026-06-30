import test from "node:test";
import assert from "node:assert/strict";

import {
  findLatestObservationOnOrBefore,
  normalizeFredObservations,
  subtractUtcDays
} from "../src/domain/observations.js";
import { calculateMarketPriceMetrics } from "../src/domain/market-price.js";

const raw = [
  { date: "2026-05-01", value: "4.20" },
  { date: "2026-05-08", value: "." },
  { date: "2026-05-09", value: "4.25" },
  { date: "2026-05-23", value: "4.30" },
  { date: "2026-05-30", value: "4.35" }
];

test("normalizes FRED observations and removes missing values", () => {
  assert.deepEqual(normalizeFredObservations(raw), [
    { date: "2026-05-01", value: 4.2 },
    { date: "2026-05-09", value: 4.25 },
    { date: "2026-05-23", value: 4.3 },
    { date: "2026-05-30", value: 4.35 }
  ]);
});

test("selects latest valid observation on or before target date", () => {
  const observations = normalizeFredObservations(raw);
  assert.deepEqual(findLatestObservationOnOrBefore(observations, "2026-05-24"), {
    date: "2026-05-23",
    value: 4.3
  });
});

test("subtracts UTC days without timezone drift", () => {
  assert.equal(subtractUtcDays("2026-05-31", 7), "2026-05-24");
  assert.equal(subtractUtcDays("2026-03-01", 1), "2026-02-28");
});

test("calculates us2y weekly and four-week changes in basis points", () => {
  const metrics = calculateMarketPriceMetrics({
    observations: raw,
    asOf: "2026-05-31",
    calculation: {
      method: "basis_point_difference",
      weeklyLookbackDays: 7,
      fourWeekLookbackDays: 28,
      changeUnit: "bp",
      percentagePointToBasisPoint: 100
    }
  });

  assert.equal(metrics.currentObservationDate, "2026-05-30");
  assert.equal(metrics.weeklyReferenceDate, "2026-05-23");
  assert.equal(metrics.fourWeekReferenceDate, "2026-05-01");
  assert.ok(Math.abs(metrics.weeklyChange - 5) < 1e-10);
  assert.ok(Math.abs(metrics.fourWeekChange - 15) < 1e-10);
});
