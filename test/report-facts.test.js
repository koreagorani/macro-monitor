import test from "node:test";
import assert from "node:assert/strict";

import {
  buildReportFacts,
  calculateIndicatorRiskContributions
} from "../src/report/build-report-facts.js";
import { validateReportFactsConsistency } from "../src/report/validate-report-consistency.js";
import { validateReportFacts } from "../src/validation/validate-report-facts.js";
import { buildReportV2Fixture } from "../test-support/report-v2-fixture.js";

function clone(value) {
  return structuredClone(value);
}

test("report facts preserve all market and Core PCE source metrics", async () => {
  const { reportFacts, indicatorOutputs } = await buildReportV2Fixture();
  const sourceById = new Map(indicatorOutputs.map((item) => [item.indicatorId, item]));

  assert.equal(reportFacts.indicators.length, 6);
  for (const fact of reportFacts.indicators.filter(({ type }) => type === "market_price")) {
    const source = sourceById.get(fact.indicatorId).metrics;
    for (const key of [
      "currentValue",
      "currentObservationDate",
      "weeklyChange",
      "weeklyChangeUnit",
      "weeklyReferenceDate",
      "fourWeekChange",
      "fourWeekChangeUnit",
      "fourWeekReferenceDate"
    ]) {
      assert.deepEqual(fact[key], source[key], `${fact.indicatorId}.${key}`);
    }
  }

  const pce = reportFacts.indicators.find(({ indicatorId }) => indicatorId === "core_pce");
  const pceSource = sourceById.get("core_pce").metrics;
  for (const key of [
    "currentObservationDate",
    "referenceMonth",
    "currentMoM",
    "previousMoM",
    "threeMonthAverageMoM",
    "consensusMoM"
  ]) {
    assert.deepEqual(pce[key], pceSource[key], `core_pce.${key}`);
  }
});

test("report facts join status, score, threshold, priority, and deterministic note", async () => {
  const { reportFacts, riskOutput } = await buildReportV2Fixture();
  const statusById = new Map(riskOutput.indicatorStatuses.map((item) => [item.indicatorId, item]));

  assert.deepEqual(
    reportFacts.indicators.map(({ indicatorId, reportPriority }) => [indicatorId, reportPriority]),
    [["us2y", 1], ["core_pce", 2], ["wti", 3], ["usdkrw", 4], ["btc", 6], ["sp500", 5]]
  );
  for (const fact of reportFacts.indicators) {
    const status = statusById.get(fact.indicatorId);
    assert.equal(fact.status, status.status);
    assert.equal(fact.score, status.score);
    assert.match(fact.factNote, /기준|데이터 사용 불가/);
  }
  assert.deepEqual(
    reportFacts.indicators.find(({ indicatorId }) => indicatorId === "us2y").selectedEvaluation.threshold,
    { operator: ">", value: 10 }
  );
});

test("indicator contribution decomposes the normalized overall weighted score", async () => {
  const { reportFacts, riskOutput } = await buildReportV2Fixture();
  const contributionSum = reportFacts.indicators.reduce(
    (sum, { riskContribution }) => sum + (riskContribution ?? 0),
    0
  );

  assert.ok(Math.abs(contributionSum - riskOutput.overallRisk.score) < 1e-15);
});

test("indicator contribution adds the same indicator across multiple areas", () => {
  const contributions = calculateIndicatorRiskContributions({
    areaRisks: [
      {
        areaId: "area_one",
        weight: 0.75,
        score: 1,
        contributingIndicators: [
          { indicatorId: "shared", areaWeight: 1, weightedScore: 1 }
        ]
      },
      {
        areaId: "area_two",
        weight: 0.25,
        score: 2,
        contributingIndicators: [
          { indicatorId: "shared", areaWeight: 1, weightedScore: 2 }
        ]
      }
    ]
  });

  assert.equal(contributions.get("shared"), 1.25);
});

test("unavailable indicators have null risk contribution and preserved null metrics", async () => {
  const fixture = await buildReportV2Fixture();
  const indicatorOutputs = clone(fixture.indicatorOutputs);
  const riskOutput = clone(fixture.riskOutput);
  const btcOutput = indicatorOutputs.find(({ indicatorId }) => indicatorId === "btc");
  btcOutput.available = false;
  btcOutput.metrics = null;
  btcOutput.error = { code: "FRED_REQUEST_FAILED", message: "Synthetic failure." };
  const btcStatus = riskOutput.indicatorStatuses.find(({ indicatorId }) => indicatorId === "btc");
  Object.assign(btcStatus, {
    available: false,
    status: "unavailable",
    score: null,
    selectedEvaluation: null,
    evaluations: []
  });

  const reportFacts = buildReportFacts({
    indicatorOutputs,
    riskOutput,
    portfolioVulnerability: fixture.portfolioVulnerability,
    indicatorConfig: fixture.indicatorConfig,
    thresholdsConfig: fixture.thresholdsConfig
  });
  const btc = reportFacts.indicators.find(({ indicatorId }) => indicatorId === "btc");

  assert.equal(btc.riskContribution, null);
  assert.equal(btc.currentValue, null);
  assert.equal(btc.weeklyChange, null);
  assert.equal(btc.factNote, "데이터 사용 불가");
});

test("report facts schema rejects wrong counts, duplicate IDs, and placeholders", async () => {
  const { reportFacts } = await buildReportV2Fixture();
  const five = clone(reportFacts);
  five.indicators.pop();
  assert.equal((await validateReportFacts(five)).valid, false);

  const seven = clone(reportFacts);
  seven.indicators.push(clone(seven.indicators[0]));
  assert.equal((await validateReportFacts(seven)).valid, false);

  const duplicate = clone(reportFacts);
  duplicate.indicators[1].indicatorId = duplicate.indicators[0].indicatorId;
  const duplicateValidation = await validateReportFacts(duplicate);
  assert.equal(duplicateValidation.valid, true, "ID uniqueness is enforced by code consistency, not uniqueItems");

  const placeholder = clone(reportFacts);
  placeholder.areaRisks[0].name = "  ---  ";
  assert.equal((await validateReportFacts(placeholder)).valid, false);
});

test("report facts consistency rejects duplicate/missing IDs and source changes", async () => {
  const fixture = await buildReportV2Fixture();
  const changed = clone(fixture.reportFacts);
  changed.indicators[1].indicatorId = changed.indicators[0].indicatorId;
  changed.areaRisks[1].areaId = changed.areaRisks[0].areaId;
  changed.indicators[0].currentValue += 1;

  const validation = validateReportFactsConsistency({
    ...fixture,
    reportFacts: changed
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some(({ keyword }) => keyword === "duplicateId"));
  assert.ok(validation.errors.some(({ keyword }) => keyword === "exactSet"));
  assert.ok(validation.errors.some(({ keyword }) => keyword === "sourceConsistency"));
});

test("report facts and exact source consistency validate in normal flow", async () => {
  const fixture = await buildReportV2Fixture();
  const schema = await validateReportFacts(fixture.reportFacts);
  const consistency = validateReportFactsConsistency(fixture);

  assert.equal(schema.valid, true);
  assert.equal(consistency.valid, true);
});
