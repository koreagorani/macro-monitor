import { loadIndicatorConfig, loadJsonFile } from "../src/config/load-config.js";
import { evaluateIndicatorStatuses } from "../src/risk/evaluate-indicator.js";
import { aggregateAreaRisks } from "../src/risk/aggregate-areas.js";
import { evaluateOverallRisk } from "../src/risk/evaluate-overall-risk.js";
import { evaluatePortfolioVulnerability } from "../src/portfolio/evaluate-portfolio-vulnerability.js";
import { buildReportFacts } from "../src/report/build-report-facts.js";
import { buildWeeklyReportOutput } from "../src/report/build-weekly-report-output.js";
import { buildMacroReviewOutput } from "../src/review/build-macro-review-output.js";

const AS_OF = "2026-07-05";
const GENERATED_AT = "2026-07-05T09:00:00.000Z";

function marketIndicator({ indicatorId, name, unit, currentValue, observationDate, weeklyChange, weeklyChangeUnit = "%", fourWeekChange }) {
  return {
    indicatorId,
    name,
    type: "market_price",
    asOf: AS_OF,
    unit,
    available: true,
    status: null,
    source: {
      provider: "FRED",
      seriesId: `TEST_${indicatorId.toUpperCase()}`,
      originalSource: "Synthetic test fixture"
    },
    metrics: {
      currentValue,
      currentObservationDate: observationDate,
      weeklyChange,
      weeklyChangeUnit,
      weeklyReferenceDate: "2026-06-27",
      fourWeekChange,
      fourWeekChangeUnit: weeklyChangeUnit,
      fourWeekReferenceDate: "2026-06-06"
    },
    error: null
  };
}

export function buildIndicatorOutputsFixture() {
  return [
    marketIndicator({
      indicatorId: "us2y",
      name: "미국 2년물 국채금리",
      unit: "%",
      currentValue: 4.3217,
      observationDate: "2026-07-03",
      weeklyChange: 12.4,
      weeklyChangeUnit: "bp",
      fourWeekChange: -8.6
    }),
    {
      indicatorId: "core_pce",
      name: "근원 PCE",
      type: "scheduled_release",
      asOf: AS_OF,
      unit: "% MoM",
      available: true,
      status: null,
      source: {
        provider: "FRED",
        seriesId: "PCEPILFE",
        originalSource: "U.S. Bureau of Economic Analysis"
      },
      metrics: {
        currentMoM: 0.22,
        previousMoM: 0.19,
        threeMonthAverageMoM: 0.24,
        consensusMoM: null,
        referenceMonth: "2026-05",
        currentObservationDate: "2026-05-01"
      },
      error: null
    },
    marketIndicator({
      indicatorId: "wti",
      name: "WTI",
      unit: "USD/barrel",
      currentValue: 75.34,
      observationDate: "2026-07-02",
      weeklyChange: 3.6,
      fourWeekChange: 6.2
    }),
    marketIndicator({
      indicatorId: "usdkrw",
      name: "원·달러 환율",
      unit: "KRW/USD",
      currentValue: 1375.42,
      observationDate: "2026-07-03",
      weeklyChange: 0.4,
      fourWeekChange: 1.1
    }),
    marketIndicator({
      indicatorId: "btc",
      name: "비트코인",
      unit: "USD",
      currentValue: 105432.19,
      observationDate: "2026-07-04",
      weeklyChange: -6.4,
      fourWeekChange: -4.2
    }),
    marketIndicator({
      indicatorId: "sp500",
      name: "S&P 500",
      unit: "index",
      currentValue: 6201.37,
      observationDate: "2026-07-03",
      weeklyChange: -0.8,
      fourWeekChange: 2.2
    })
  ];
}

export function buildWeeklyAnalysisFixture() {
  return {
    schemaVersion: "1.0.0",
    oneLookAnalysis: {
      coreChanges: [
        "금리와 공급 측 신호가 함께 경계 방향을 가리킵니다.",
        "위험선호 신호는 자산군별로 엇갈립니다."
      ],
      recommendedAction: "신규매수 신중"
    },
    macroJudgment: {
      riskCharacter: "mixed",
      directionAgreement: "금리와 공급 영역은 같은 방향이지만 위험선호 내부 신호는 엇갈립니다.",
      conflictingSignals: ["방어 필요성과 일부 위험자산 회복 신호가 공존합니다."],
      summary: "복합 위험의 지속 여부를 확인할 구간입니다."
    },
    areaInsights: [
      { areaId: "rates_policy", keyReason: "금리 변화가 정책 민감도를 높였습니다." },
      { areaId: "inflation_supply", keyReason: "공급 측 압력이 완전히 해소되지 않았습니다." },
      { areaId: "risk_appetite", keyReason: "위험자산 신호가 서로 엇갈립니다." },
      { areaId: "dollar_korea", keyReason: "한국 금융환경 신호는 상대적으로 안정적입니다." }
    ],
    themeInsights: [
      {
        themeId: "crypto_altcoins",
        keyReasons: ["유동성과 위험선호 변화에 민감합니다."],
        action: "신규매수 신중"
      },
      {
        themeId: "us_large_cap_growth",
        keyReasons: ["금리와 위험선호 변화에 함께 노출됩니다."],
        action: "투자 가설 재확인"
      },
      {
        themeId: "long_duration_bonds",
        keyReasons: ["금리 민감도가 높은 구간입니다."],
        action: "헤지 검토"
      }
    ],
    hedgeAndDefense: {
      needLevel: "medium",
      summary: "위험 신호가 겹친 영역에 대해 방어 수단을 비교할 필요가 있습니다.",
      candidates: [
        {
          candidateId: "cash_krw",
          whyItFits: "유동성 완충 역할을 할 수 있습니다.",
          failureCondition: "위험선호가 빠르게 회복되면 기회비용이 커질 수 있습니다.",
          cashComparison: "가장 단순한 방어 기준점입니다."
        }
      ]
    },
    nextWeekChecklist: {
      scheduledIndicators: ["정기 발표형 지표의 다음 관측치를 확인합니다."],
      riskStrengtheningConditions: ["여러 영역의 경계 신호가 함께 지속되는지 확인합니다."],
      riskEasingConditions: ["금리와 위험선호 신호가 동시에 완화되는지 확인합니다."],
      invalidatingConditions: ["현재 신호가 일회성 변동으로 되돌려지는지 확인합니다."]
    },
    decisionLog: {
      baseScenario: "복합 위험이 이어지지만 일부 신호는 상충하는 상태입니다.",
      reviewItems: ["상충 신호가 어느 방향으로 해소되는지 재검토합니다."]
    }
  };
}

export async function buildReportV2Fixture() {
  const [indicatorConfig, thresholdsConfig, riskAreasConfig, portfolioThemesConfig, hedgeCandidatesConfig] = await Promise.all([
    loadIndicatorConfig(),
    loadJsonFile("config/thresholds.json"),
    loadJsonFile("config/risk-areas.json"),
    loadJsonFile("config/portfolio-themes.json"),
    loadJsonFile("config/hedge-candidates.json")
  ]);
  const indicatorOutputs = buildIndicatorOutputsFixture();
  const indicatorStatuses = evaluateIndicatorStatuses({ indicatorOutputs, thresholdsConfig });
  const areaRisks = aggregateAreaRisks({ indicatorStatuses, riskAreasConfig });
  const quality = {
    shouldAbort: false,
    confidence: "normal",
    coreIndicatorIds: riskAreasConfig.coreIndicators,
    nonCoreIndicatorIds: riskAreasConfig.nonCoreIndicators,
    failedCoreIndicators: [],
    failedNonCoreIndicators: [],
    availableIndicatorCount: 6,
    unavailableIndicatorCount: 0,
    warnings: []
  };
  const overallRisk = evaluateOverallRisk({ areaRisks, quality });
  const riskOutput = {
    schemaVersion: "1.0.0",
    asOf: AS_OF,
    quality,
    indicatorStatuses,
    areaRisks,
    overallRisk,
    warnings: []
  };
  const portfolioVulnerability = evaluatePortfolioVulnerability({
    riskOutput,
    portfolioThemesConfig,
    hedgeCandidatesConfig
  });
  const reportFacts = buildReportFacts({
    indicatorOutputs,
    riskOutput,
    portfolioVulnerability,
    indicatorConfig,
    thresholdsConfig
  });
  const macroReviewOutput = buildMacroReviewOutput({
    riskOutput,
    portfolioVulnerability,
    reportFacts,
    generatedAt: GENERATED_AT
  });
  const analysis = buildWeeklyAnalysisFixture();
  const weeklyReportOutput = buildWeeklyReportOutput({
    macroReviewOutput,
    analysis,
    generatedAt: GENERATED_AT
  });

  return {
    indicatorConfig,
    thresholdsConfig,
    riskAreasConfig,
    portfolioThemesConfig,
    hedgeCandidatesConfig,
    indicatorOutputs,
    riskOutput,
    portfolioVulnerability,
    reportFacts,
    macroReviewOutput,
    analysis,
    weeklyReportOutput
  };
}

export { AS_OF, GENERATED_AT };
