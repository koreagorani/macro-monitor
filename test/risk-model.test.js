import test from "node:test";
import assert from "node:assert/strict";

import { loadJsonFile } from "../src/config/load-config.js";
import { evaluateQualityGate } from "../src/risk/quality-gate.js";
import { evaluateIndicatorStatus } from "../src/risk/evaluate-indicator.js";
import { validateRiskOutput } from "../src/validation/validate-risk-output.js";

const riskAreasConfig = await loadJsonFile("config/risk-areas.json");
const thresholdsConfig = await loadJsonFile("config/thresholds.json");

function output(indicatorId, available = true, metrics = {}) {
  return {
    indicatorId,
    available,
    metrics
  };
}

test("quality gate aborts when two core indicators fail", () => {
  const quality = evaluateQualityGate({
    riskAreasConfig,
    indicatorOutputs: [
      output("us2y", false),
      output("core_pce", false),
      output("wti"),
      output("usdkrw"),
      output("sp500"),
      output("btc")
    ]
  });

  assert.equal(quality.shouldAbort, true);
  assert.equal(quality.confidence, "aborted");
  assert.deepEqual(quality.failedCoreIndicators.map((item) => item.indicatorId), ["us2y", "core_pce"]);
});

test("quality gate reduces confidence when one core indicator fails", () => {
  const quality = evaluateQualityGate({
    riskAreasConfig,
    indicatorOutputs: [
      output("us2y", false),
      output("core_pce"),
      output("wti"),
      output("usdkrw"),
      output("sp500"),
      output("btc")
    ]
  });

  assert.equal(quality.shouldAbort, false);
  assert.equal(quality.confidence, "reduced");
});

test("quality gate continues when only btc fails", () => {
  const quality = evaluateQualityGate({
    riskAreasConfig,
    indicatorOutputs: [
      output("us2y"),
      output("core_pce"),
      output("wti"),
      output("usdkrw"),
      output("sp500"),
      output("btc", false)
    ]
  });

  assert.equal(quality.shouldAbort, false);
  assert.equal(quality.confidence, "normal");
  assert.deepEqual(quality.failedNonCoreIndicators.map((item) => item.indicatorId), ["btc"]);
  assert.equal(quality.warnings[0].code, "NON_CORE_INDICATOR_UNAVAILABLE");
});

test("unavailable indicator is not threshold evaluated", () => {
  const status = evaluateIndicatorStatus({
    thresholdsConfig,
    indicatorOutput: output("us2y", false)
  });

  assert.equal(status.status, "unavailable");
  assert.equal(status.score, null);
  assert.equal(status.selectedEvaluation, null);
});

test("disabled and future threshold rules are ignored", () => {
  const localThresholds = {
    indicators: {
      sample: {
        enabled: true,
        activeMetrics: [
          {
            metricPath: "metrics.weeklyChange",
            unit: "%",
            rules: [
              {
                id: "sample_normal",
                when: { operator: "default" },
                status: "normal",
                score: 0
              }
            ]
          }
        ],
        disabledMetrics: [
          {
            name: "ignored_strong_alert",
            rules: [
              {
                id: "ignored",
                when: { operator: ">=", value: 1 },
                status: "strong_alert",
                score: 3
              }
            ]
          }
        ]
      }
    },
    futureMetrics: [
      {
        name: "ignored_future_metric",
        rules: [
          {
            id: "future",
            when: { operator: ">=", value: 1 },
            status: "strong_alert",
            score: 3
          }
        ]
      }
    ]
  };

  const status = evaluateIndicatorStatus({
    thresholdsConfig: localThresholds,
    indicatorOutput: output("sample", true, { weeklyChange: 999 })
  });

  assert.equal(status.status, "normal");
  assert.equal(status.score, 0);
});

test("highest score matching threshold wins", () => {
  const status = evaluateIndicatorStatus({
    thresholdsConfig,
    indicatorOutput: output("us2y", true, { weeklyChange: 35 })
  });

  assert.equal(status.status, "strong_alert");
  assert.equal(status.score, 3);
  assert.equal(status.selectedEvaluation.matchedRuleId, "us2y_weekly_strong_alert");
});

test("risk output schema validates first vertical slice output", async () => {
  const indicatorOutputs = [
    output("us2y", true, { weeklyChange: 35 })
  ];
  const quality = evaluateQualityGate({
    riskAreasConfig: {
      ...riskAreasConfig,
      coreIndicators: ["us2y"],
      nonCoreIndicators: []
    },
    indicatorOutputs
  });
  const indicatorStatuses = [
    evaluateIndicatorStatus({
      thresholdsConfig,
      indicatorOutput: indicatorOutputs[0]
    })
  ];

  const validation = await validateRiskOutput({
    schemaVersion: "1.0.0",
    asOf: "2026-07-05",
    quality,
    indicatorStatuses,
    areaRisks: [],
    overallRisk: null,
    warnings: quality.warnings
  });

  assert.equal(validation.valid, true);
});
