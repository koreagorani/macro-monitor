import {
  EMPTY_VALUE,
  formatCorePceValue,
  formatDate,
  formatIndicatorChange,
  formatIndicatorCurrentValue,
  formatScore
} from "../report/format-report-value.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function display(value, fallback = EMPTY_VALUE) {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function escapeEnhancedMarkdownText(value) {
  return display(value)
    .replaceAll("\n", " ")
    .replace(/([\\*~`$\[\]<>\{\}|^])/g, "\\$1");
}

function renderBulletList(items, { limit = null, emptyText = "해당 없음", indent = "" } = {}) {
  const values = asArray(items);
  const selected = limit === null ? values : values.slice(0, limit);
  if (selected.length === 0) return `${indent}- ${emptyText}`;
  return selected.map((item) => `${indent}- ${display(item)}`).join("\n");
}

function renderEnhancedMarkdownTable(headers, rows) {
  const lines = ['<table fit-page-width="true" header-row="true">', "\t<tr>"];
  for (const header of headers) lines.push(`\t\t<td>${escapeEnhancedMarkdownText(header)}</td>`);
  lines.push("\t</tr>");
  for (const row of rows) {
    lines.push("\t<tr>");
    for (const cell of row) lines.push(`\t\t<td>${escapeEnhancedMarkdownText(cell)}</td>`);
    lines.push("\t</tr>");
  }
  lines.push("</table>");
  return lines.join("\n");
}

function renderRiskLabel(overallRisk = {}) {
  const level = display(overallRisk.level);
  const label = display(overallRisk.label);
  return level === label || label === EMPTY_VALUE ? level : `${level} (${label})`;
}

function renderWeeklyReportMarkdown(weeklyReportOutput = {}) {
  const facts = weeklyReportOutput.facts ?? {};
  const analysis = weeklyReportOutput.analysis ?? {};
  const overallRisk = facts.overallRisk ?? {};
  const areaInsightMap = new Map(asArray(analysis.areaInsights).map((item) => [item.areaId, item]));
  const themeInsightMap = new Map(asArray(analysis.themeInsights).map((item) => [item.themeId, item]));
  const indicators = [...asArray(facts.indicators)].sort(
    (left, right) => left.reportPriority - right.reportPriority
  );
  const marketIndicators = indicators.filter(({ type }) => type === "market_price");
  const corePce = indicators.find(({ indicatorId }) => indicatorId === "core_pce");
  const areaRisks = asArray(facts.areaRisks);
  const portfolioThemes = asArray(facts.portfolioThemes).slice(0, 3);
  const hedge = analysis.hedgeAndDefense ?? {};
  const checklist = analysis.nextWeekChecklist ?? {};
  const decisionLog = analysis.decisionLog ?? {};
  const macroJudgment = analysis.macroJudgment ?? {};
  const warnings = asArray(weeklyReportOutput.warnings);
  const lines = [];

  lines.push(`# ${display(weeklyReportOutput.presentation?.title, "주간 매크로 보고서")}`);
  lines.push("");

  lines.push("## 1. 한눈에 보는 전체 상태");
  lines.push("");
  lines.push(`- 기준일: ${formatDate(facts.asOf ?? weeklyReportOutput.asOf)}`);
  lines.push(`- 생성시각: ${formatDate(weeklyReportOutput.generatedAt)}`);
  lines.push(`- 전체 위험: ${renderRiskLabel(overallRisk)}`);
  lines.push(`- 전체 위험 점수: ${formatScore(overallRisk.score)}`);
  lines.push(`- 신뢰도: ${display(overallRisk.confidence)}`);
  lines.push(`- 권장 대응: ${display(analysis.oneLookAnalysis?.recommendedAction)}`);
  lines.push("");

  lines.push("## 2. 핵심 지표 데이터 현황");
  lines.push("");
  lines.push("### 시장가격형 지표");
  lines.push("");
  lines.push(renderEnhancedMarkdownTable(
    ["지표", "현재값", "관측일", "1주 변화", "1주 기준일", "4주 변화", "4주 기준일", "상태", "사실 메모"],
    marketIndicators.map((indicator) => [
      indicator.name,
      formatIndicatorCurrentValue(indicator),
      formatDate(indicator.currentObservationDate),
      formatIndicatorChange(indicator.weeklyChange, indicator.weeklyChangeUnit),
      formatDate(indicator.weeklyReferenceDate),
      formatIndicatorChange(indicator.fourWeekChange, indicator.fourWeekChangeUnit),
      formatDate(indicator.fourWeekReferenceDate),
      indicator.status,
      indicator.factNote
    ])
  ));
  lines.push("");
  lines.push("### Core PCE");
  lines.push("");
  lines.push(renderEnhancedMarkdownTable(
    ["지표", "최신 전월비", "이전 전월비", "최근 3개월 평균 전월비", "consensus", "관측일", "기준월", "상태", "사실 메모"],
    corePce ? [[
      corePce.name,
      formatCorePceValue(corePce.currentMoM, corePce.unit),
      formatCorePceValue(corePce.previousMoM, corePce.unit),
      formatCorePceValue(corePce.threeMonthAverageMoM, corePce.unit),
      formatCorePceValue(corePce.consensusMoM, corePce.unit),
      formatDate(corePce.currentObservationDate),
      display(corePce.referenceMonth),
      corePce.status,
      corePce.factNote
    ]] : []
  ));
  lines.push("");

  lines.push("## 3. 영역별 위험과 AI 해석");
  lines.push("");
  lines.push(renderEnhancedMarkdownTable(
    ["영역", "점수", "상태", "AI 해석"],
    areaRisks.map((area) => [
      area.name,
      formatScore(area.score),
      area.status,
      areaInsightMap.get(area.areaId)?.keyReason
    ])
  ));
  lines.push("");
  lines.push("### 이번 주 매크로 판단");
  lines.push("");
  lines.push(`- 위험 성격: ${display(macroJudgment.riskCharacter)}`);
  lines.push(`- 요약: ${display(macroJudgment.summary)}`);
  lines.push(`- 방향 일치 여부: ${display(macroJudgment.directionAgreement)}`);
  lines.push("- 핵심 변화:");
  lines.push(renderBulletList(analysis.oneLookAnalysis?.coreChanges, { limit: 3, indent: "  " }));
  lines.push("- 상충 신호:");
  lines.push(renderBulletList(macroJudgment.conflictingSignals, { indent: "  " }));
  lines.push("");

  lines.push("## 4. 포트폴리오 취약 테마");
  lines.push("");
  if (portfolioThemes.length === 0) {
    lines.push("- 해당 없음");
    lines.push("");
  } else {
    portfolioThemes.forEach((theme, index) => {
      const insight = themeInsightMap.get(theme.themeId) ?? {};
      lines.push(`### ${index + 1}. ${display(theme.name)}`);
      lines.push("");
      lines.push(`- 취약도 점수: ${formatScore(theme.score)}`);
      lines.push(`- 단계: ${display(theme.level)}`);
      lines.push(`- 대응: ${display(insight.action)}`);
      lines.push("- 핵심 이유:");
      lines.push(renderBulletList(insight.keyReasons, { limit: 2, indent: "  " }));
      lines.push("");
    });
  }

  lines.push("## 5. 대응 및 다음 주 확인 조건");
  lines.push("");
  lines.push("### 헷지 및 방어");
  lines.push("");
  lines.push(`- 필요성: ${display(hedge.needLevel)}`);
  lines.push(`- 요약: ${display(hedge.summary)}`);
  const candidates = asArray(hedge.candidates).slice(0, 2);
  if (candidates.length > 0) {
    lines.push("- 후보:");
    candidates.forEach((candidate) => {
      lines.push(`  - ${display(candidate.candidateId)}: ${display(candidate.whyItFits)}`);
      lines.push(`    - 실패 조건: ${display(candidate.failureCondition)}`);
      lines.push(`    - 현금 비교: ${display(candidate.cashComparison)}`);
    });
  }
  lines.push("");
  lines.push("### 다음 주 확인 조건");
  lines.push("");
  lines.push("#### 예정 지표");
  lines.push(renderBulletList(checklist.scheduledIndicators));
  lines.push("#### 위험 강화 조건");
  lines.push(renderBulletList(checklist.riskStrengtheningConditions));
  lines.push("#### 위험 완화 조건");
  lines.push(renderBulletList(checklist.riskEasingConditions));
  lines.push("#### 기본 시나리오 무효화 조건");
  lines.push(renderBulletList(checklist.invalidatingConditions));
  lines.push("");
  lines.push("### 판단 기록");
  lines.push("");
  lines.push(`- 기본 시나리오: ${display(decisionLog.baseScenario)}`);
  lines.push("- 사후 확인 항목:");
  lines.push(renderBulletList(decisionLog.reviewItems, { indent: "  " }));
  lines.push("");

  lines.push("## 6. 경고 및 주의 문구");
  lines.push("");
  lines.push("### 경고");
  lines.push("");
  lines.push(renderBulletList(warnings.map((warning) => `${display(warning.code)}: ${display(warning.message)}`)));
  lines.push("");
  lines.push("### 주의");
  lines.push("");
  lines.push(`> ${display(
    weeklyReportOutput.presentation?.mandatoryDisclosure,
    "취약도는 현재 매크로 환경에 대한 노출 정도이며, 기대수익률이나 직접적인 매도 신호가 아닙니다."
  )}`);

  return `${lines.join("\n").trim()}\n`;
}

export {
  escapeEnhancedMarkdownText,
  renderEnhancedMarkdownTable,
  renderWeeklyReportMarkdown
};
