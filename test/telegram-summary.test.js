import assert from "node:assert/strict";
import test from "node:test";

import { loadJsonFile } from "../src/config/load-config.js";
import {
  formatCorePceValue, formatDate, formatIndicatorChange, formatIndicatorCurrentValue
} from "../src/report/format-report-value.js";
import {
  MAX_TELEGRAM_VISIBLE_LENGTH,
  buildTelegramSummary,
  escapeHtml,
  visibleTextLength
} from "../src/telegram/build-telegram-summary.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function fixture() {
  const weeklyReportOutput = clone(await loadJsonFile("data/examples/weekly-report-output.example.json"));
  const riskOutput = {
    schemaVersion: "1.0.0",
    asOf: weeklyReportOutput.asOf,
    quality: { shouldAbort: false, confidence: weeklyReportOutput.facts.overallRisk.confidence }
  };
  return { riskOutput, weeklyReportOutput };
}

test("escapeHtml escapes every dynamic HTML delimiter", () => {
  assert.equal(escapeHtml("A & B < C > D"), "A &amp; B &lt; C &gt; D");
});

for (const level of ["normal", "watch"]) {
  test(`${level} uses the normal weekly summary title`, async () => {
    const { riskOutput, weeklyReportOutput } = await fixture();
    weeklyReportOutput.facts.overallRisk.level = level;
    const summary = buildTelegramSummary({ riskOutput, weeklyReportOutput });
    assert.match(summary.text, /^<b>주간 매크로 요약<\/b>/);
    assert.doesNotMatch(summary.text, /주간 매크로 경고/);
  });
}

for (const level of ["alert", "high_risk"]) {
  test(`${level} uses one warning title`, async () => {
    const { riskOutput, weeklyReportOutput } = await fixture();
    weeklyReportOutput.facts.overallRisk.level = level;
    const summary = buildTelegramSummary({ riskOutput, weeklyReportOutput });
    assert.match(summary.text, /^<b>⚠️ 주간 매크로 경고<\/b>/);
    assert.equal((summary.text.match(/주간 매크로 경고/g) ?? []).length, 1);
  });
}

test("weekly summary contains contract fields and escapes dynamic content", async () => {
  const { riskOutput, weeklyReportOutput } = await fixture();
  weeklyReportOutput.analysis.oneLookAnalysis.coreChanges = ["A & B < C > D"];
  weeklyReportOutput.facts.portfolioThemes[0].name = "테마 <A&B>";
  weeklyReportOutput.analysis.oneLookAnalysis.recommendedAction = "투자 가설 재확인";
  const summary = buildTelegramSummary({ riskOutput, weeklyReportOutput });

  assert.match(summary.text, /기준일:/);
  assert.match(summary.text, /전체 위험 단계:/);
  assert.match(summary.text, /전체 위험 점수:/);
  assert.match(summary.text, /신뢰도:/);
  assert.match(summary.text, /A &amp; B &lt; C &gt; D/);
  assert.match(summary.text, /테마 &lt;A&amp;B&gt;/);
  assert.match(summary.text, /전체 보고서: Notion의 Macro Weekly Reports에서 확인/);
  assert.match(summary.text, /취약도는 기대수익률이나 직접적인 매도 신호가 아니라 매크로 노출도/);
  assert.equal(summary.notificationType, "weekly");
  assert.equal(summary.deliveryKey, `telegram-weekly:${weeklyReportOutput.asOf}`);
});

test("weekly summary limits core changes and vulnerable themes to three", async () => {
  const { riskOutput, weeklyReportOutput } = await fixture();
  weeklyReportOutput.analysis.oneLookAnalysis.coreChanges = ["change-1", "change-2", "change-3", "change-4"];
  weeklyReportOutput.facts.portfolioThemes = [1, 2, 3, 4].map((index) => ({
    name: `theme-${index}`,
    level: "watch",
    score: index
  }));
  const { text } = buildTelegramSummary({ riskOutput, weeklyReportOutput });

  assert.match(text, /change-1/);
  assert.match(text, /change-3/);
  assert.doesNotMatch(text, /change-4/);
  assert.match(text, /theme-3/);
  assert.doesNotMatch(text, /theme-4/);
});

test("reduced confidence includes the fixed warning", async () => {
  const { riskOutput, weeklyReportOutput } = await fixture();
  weeklyReportOutput.facts.overallRisk.confidence = "reduced";
  const { text } = buildTelegramSummary({ riskOutput, weeklyReportOutput });
  assert.match(text, /데이터 누락 또는 상충 신호로 판단 신뢰도가 낮아졌습니다/);
});

test("shouldAbort builds only a safe quality failure notification", () => {
  const riskOutput = {
    asOf: "2026-07-18",
    quality: {
      shouldAbort: true,
      confidence: "aborted",
      failedCoreIndicators: [
        { indicatorId: "us2y<script>", reason: "raw-reason-one" },
        { indicatorId: "core_pce", reason: "raw-reason-two" }
      ],
      warnings: [
        { code: "CORE_INDICATOR_UNAVAILABLE", message: "raw private error" },
        { code: "INDICATOR_SCHEMA_VALIDATION_FAILED", message: "raw API response" }
      ]
    }
  };
  const summary = buildTelegramSummary({ riskOutput });

  assert.equal(summary.notificationType, "quality_failure");
  assert.equal(summary.deliveryKey, "telegram-quality:2026-07-18");
  assert.match(summary.text, /AI 주간 보고서 생성과 Notion 저장을 생략했습니다/);
  assert.match(summary.text, /us2y&lt;script&gt;/);
  assert.match(summary.text, /CORE_INDICATOR_UNAVAILABLE/);
  assert.doesNotMatch(summary.text, /전체 위험 단계|전체 위험 점수|권장 대응/);
  assert.doesNotMatch(summary.text, /raw-reason|raw private error|raw API response/);
});

test("long optional details are truncated under the 3500-character limit", async () => {
  const { riskOutput, weeklyReportOutput } = await fixture();
  weeklyReportOutput.analysis.oneLookAnalysis.coreChanges = Array.from({ length: 6 }, () => "긴 변화 ".repeat(1_000));
  weeklyReportOutput.facts.portfolioThemes = Array.from({ length: 6 }, (_, index) => ({
    name: `theme-${index}-${"긴 이름".repeat(1_000)}`,
    level: "watch",
    score: index
  }));
  weeklyReportOutput.analysis.oneLookAnalysis.recommendedAction = "대응 ".repeat(1_000);
  const { text } = buildTelegramSummary({ riskOutput, weeklyReportOutput });

  assert.ok(visibleTextLength(text) <= MAX_TELEGRAM_VISIBLE_LENGTH);
  assert.match(text, /…/);
});

test("summary fails instead of splitting when the configured limit is still exceeded", async () => {
  const { riskOutput, weeklyReportOutput } = await fixture();
  assert.throws(
    () => buildTelegramSummary({ riskOutput, weeklyReportOutput, maxVisibleLength: 80 }),
    (error) => error.code === "TELEGRAM_SUMMARY_TOO_LONG"
  );
});

test("Telegram renders the top three actual facts before AI and formats canonical scores", async () => {
  const input = await fixture();
  const before = clone(input);
  const { text } = buildTelegramSummary(input);
  assert.ok(text.indexOf("<b>중요 실제 지표</b>") < text.indexOf("<b>판단</b>"));
  const actual = text.split("<b>중요 실제 지표</b>")[1].split("<b>판단</b>")[0];
  assert.equal((actual.match(/• /g) ?? []).length, 3);
  assert.ok(actual.indexOf("미국 2년물") < actual.indexOf("WTI"));
  assert.ok(actual.indexOf("WTI") < actual.indexOf("비트코인"));
  assert.match(text, /전체 위험 점수: 0\.55/);
  assert.match(text, /알트코인 — alert \/ 1\.98/);
  assert.deepEqual(input, before);
});

test("Telegram reuses the formatter for every market indicator and Core PCE", async () => {
  const input = await fixture();
  for (const indicator of input.weeklyReportOutput.facts.indicators) {
    indicator.status = "strong_alert";
    const { text } = buildTelegramSummary(input);
    const current = indicator.type === "market_price"
      ? formatIndicatorCurrentValue(indicator)
      : formatCorePceValue(indicator.currentMoM, indicator.unit);
    assert.ok(text.includes(escapeHtml(current)));
    assert.ok(text.includes(`관측일 ${formatDate(indicator.currentObservationDate)}`));
    if (indicator.type === "market_price") {
      assert.ok(text.includes(`1주 ${formatIndicatorChange(indicator.weeklyChange, indicator.weeklyChangeUnit)}`));
      assert.ok(text.includes(`4주 ${formatIndicatorChange(indicator.fourWeekChange, indicator.fourWeekChangeUnit)}`));
    } else {
      assert.ok(text.includes(`이전 ${formatCorePceValue(indicator.previousMoM, indicator.unit)}`));
      assert.ok(text.includes(`3개월 평균 ${formatCorePceValue(indicator.threeMonthAverageMoM, indicator.unit)}`));
      assert.doesNotMatch(text, /발표일/);
    }
    indicator.status = "normal";
  }
});

test("Telegram escapes indicator facts, preserves near-zero changes and hides unrelated fields", async () => {
  const input = await fixture();
  const wti = input.weeklyReportOutput.facts.indicators.find(({ indicatorId }) => indicatorId === "wti");
  Object.assign(wti, { status: "strong_alert", name: "<WTI>&", unit: "<USD>&",
    weeklyChange: 0.04, fourWeekChange: null, quantity: "PRIVATE_QUANTITY", marketValue: "PRIVATE_VALUE" });
  const { text } = buildTelegramSummary(input);
  assert.match(text, /&lt;WTI&gt;&amp;/);
  assert.match(text, /&lt;USD&gt;&amp;/);
  assert.match(text, /1주 \+0\.04% \/ 4주 —/);
  assert.doesNotMatch(text, /PRIVATE_QUANTITY|PRIVATE_VALUE/);
});

test("Telegram displays null actual fields as em dashes without fabricated zero values", async () => {
  const input = await fixture();
  input.weeklyReportOutput.facts.indicators.forEach((indicator) => Object.assign(indicator, {
    status: "unavailable", riskContribution: null, currentValue: null, currentMoM: null,
    previousMoM: null, threeMonthAverageMoM: null, weeklyChange: null, fourWeekChange: null,
    currentObservationDate: null
  }));
  const { text } = buildTelegramSummary(input);
  assert.match(text, /관측일 —/);
  assert.match(text, /1주 — \/ 4주 — — unavailable/);
  assert.match(text, /이전 — \/ 3개월 평균 — — unavailable/);
});

test("Telegram compact fallback preserves actual rows and fails safely if facts cannot fit", async () => {
  const input = await fixture();
  input.weeklyReportOutput.analysis.oneLookAnalysis.coreChanges = ["긴".repeat(240), "긴".repeat(240), "긴".repeat(240)];
  const normal = buildTelegramSummary(input).text;
  const { text } = buildTelegramSummary({ ...input, maxVisibleLength: visibleTextLength(normal) - 1 });
  const actual = (value) => value.split("<b>중요 실제 지표</b>")[1].split("<b>판단</b>")[0];
  assert.equal(actual(text), actual(normal));
  input.weeklyReportOutput.facts.indicators.forEach((indicator) => { indicator.name = "PRIVATE_NAME".repeat(1000); });
  assert.throws(() => buildTelegramSummary(input), (error) => {
    assert.equal(error.code, "TELEGRAM_SUMMARY_TOO_LONG");
    assert.doesNotMatch(error.message, /PRIVATE_NAME/);
    return true;
  });
});
