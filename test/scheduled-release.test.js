import test from "node:test";
import assert from "node:assert/strict";

import { calculateCorePceMetrics } from "../src/domain/scheduled-release.js";

function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-10);
}

const rows = [
  { date: "2026-01-01", value: "120.0" },
  { date: "2026-02-01", value: "120.3" },
  { date: "2026-03-01", value: "120.6" },
  { date: "2026-04-01", value: "121.2" }
];

test("calculates monthly release metrics", () => {
  const metrics = calculateCorePceMetrics({
    observations: rows,
    calculation: { threeMonthAveragePeriods: 3, consensusDefault: null }
  });

  const a = (120.3 / 120.0 - 1) * 100;
  const b = (120.6 / 120.3 - 1) * 100;
  const c = (121.2 / 120.6 - 1) * 100;

  close(metrics.currentMoM, c);
  close(metrics.previousMoM, b);
  close(metrics.threeMonthAverageMoM, (a + b + c) / 3);
  assert.equal(metrics.consensusMoM, null);
  assert.equal(metrics.referenceMonth, "2026-04");
  assert.equal(metrics.currentObservationDate, "2026-04-01");
});
