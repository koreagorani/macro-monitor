import {
  formatCorePceValue,
  formatDate,
  formatIndicatorChange,
  formatIndicatorCurrentValue,
  formatIntegerScore
} from "../report/format-report-value.js";
import { selectTelegramIndicators } from "./select-telegram-indicators.js";

const MAX_TELEGRAM_VISIBLE_LENGTH = 3_500;
const DISCLOSURE = "취약도는 기대수익률이나 직접적인 매도 신호가 아니라 매크로 노출도입니다.";
const NOTION_LOCATION = "전체 보고서: Notion의 Macro Weekly Reports에서 확인";
const STATUS_DISPLAY = Object.freeze({
  easing: { emoji: "🔵", label: "완화" },
  normal: { emoji: "🟢", label: "정상" },
  watch: { emoji: "🟡", label: "주의" },
  alert: { emoji: "🟠", label: "경계" },
  strong_alert: { emoji: "🔴", label: "강한 경계" },
  high_risk: { emoji: "🔴", label: "높은 위험" },
  unavailable: { emoji: "⚪", label: "사용 불가" }
});

class TelegramSummaryError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "TelegramSummaryError";
    this.code = code;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function truncateText(value, maxLength) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (Array.from(text).length <= maxLength) return text;
  return `${Array.from(text).slice(0, Math.max(0, maxLength - 1)).join("")}…`;
}

function visibleText(html) {
  return String(html)
    .replace(/<\/?b>/g, "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function visibleTextLength(html) {
  return Array.from(visibleText(html)).length;
}

function assertWithinLimit(text, maxVisibleLength) {
  if (visibleTextLength(text) > maxVisibleLength) {
    throw new TelegramSummaryError(
      "TELEGRAM_SUMMARY_TOO_LONG",
      `Telegram summary exceeds the ${maxVisibleLength} character visible-text limit.`
    );
  }
}

function renderList(title, items, emptyText = "없음") {
  const lines = items.length > 0
    ? items.map((item) => `• ${escapeHtml(item)}`)
    : [`• ${emptyText}`];
  return [`<b>${title}</b>`, ...lines].join("\n");
}

function renderThemes(themes) {
  const lines = themes.length > 0
    ? themes.map((theme, index) => {
        const name = escapeHtml(theme.name);
        return `${index + 1}. ${name} — ${formatStatus(theme.level)}`;
      })
    : ["• 없음"];
  return ["<b>취약 테마</b>", ...lines].join("\n");
}

function formatStatus(status) {
  const canonical = truncateText(status, 40) || "unknown";
  const display = STATUS_DISPLAY[canonical];
  return display
    ? `${display.emoji} ${display.label} (${escapeHtml(canonical)})`
    : `⚪ ${escapeHtml(canonical)}`;
}

function renderIndicators(indicators) {
  const rows = selectTelegramIndicators(indicators).map((indicator) => {
    const isPce = indicator.type === "scheduled_release";
    const current = isPce
      ? formatCorePceValue(indicator.currentMoM, indicator.unit)
      : formatIndicatorCurrentValue(indicator);
    const changes = isPce
      ? `이전 ${formatCorePceValue(indicator.previousMoM, indicator.unit)} / 3개월 평균 ${formatCorePceValue(indicator.threeMonthAverageMoM, indicator.unit)}`
      : `1주 ${formatIndicatorChange(indicator.weeklyChange, indicator.weeklyChangeUnit)} / 4주 ${formatIndicatorChange(indicator.fourWeekChange, indicator.fourWeekChangeUnit)}`;
    return `• ${escapeHtml(indicator.name)}: ${escapeHtml(current)} (관측일 ${escapeHtml(formatDate(indicator.currentObservationDate))})\n  ${escapeHtml(changes)} — ${formatStatus(indicator.status)}`;
  });
  return ["<b>중요 실제 지표</b>", ...rows].join("\n");
}

function normalizeCoreChanges(weeklyReportOutput, maxItemLength) {
  const changes = weeklyReportOutput?.schemaVersion === "2.0.0"
    ? weeklyReportOutput?.analysis?.oneLookAnalysis?.coreChanges
    : weeklyReportOutput?.report?.oneLookConclusion?.coreChanges;
  return Array.isArray(changes)
    ? changes.slice(0, 3).map((change) => truncateText(change, maxItemLength)).filter(Boolean)
    : [];
}

function normalizeThemes(weeklyReportOutput, maxNameLength) {
  const themes = weeklyReportOutput?.schemaVersion === "2.0.0"
    ? weeklyReportOutput?.facts?.portfolioThemes
    : weeklyReportOutput?.report?.portfolioThemes;
  return Array.isArray(themes)
    ? themes.slice(0, 3).map((theme) => ({
        name: truncateText(theme?.name, maxNameLength) || "이름 없음",
        level: truncateText(theme?.level, 40) || "unknown"
      }))
    : [];
}

function weeklyMessage({ weeklyReportOutput, compact = false }) {
  const isV2 = weeklyReportOutput?.schemaVersion === "2.0.0";
  const source = isV2
    ? weeklyReportOutput?.facts?.overallRisk ?? {}
    : (weeklyReportOutput?.sourceMacroReview ?? {});
  const conclusion = isV2
    ? weeklyReportOutput?.analysis?.oneLookAnalysis ?? {}
    : (weeklyReportOutput?.report?.oneLookConclusion ?? {});
  const overallLevel = isV2 ? source.level : source.overallLevel;
  const overallScore = isV2 ? source.score : source.overallScore;
  const warningTitle = overallLevel === "alert" || overallLevel === "high_risk";
  const coreChanges = normalizeCoreChanges(weeklyReportOutput, compact ? 120 : 240);
  const themes = normalizeThemes(weeklyReportOutput, compact ? 60 : 100);
  const recommendedAction = truncateText(conclusion.recommendedAction, compact ? 100 : 160) || "없음";
  const sections = [
    warningTitle ? "<b>⚠️ 주간 매크로 경고</b>" : "<b>주간 매크로 요약</b>",
    `기준일: ${escapeHtml(truncateText(weeklyReportOutput?.asOf, 40))}`,
    `전체 위험 단계: ${formatStatus(overallLevel)}`,
    `보조 위험 점수: ${escapeHtml(formatIntegerScore(overallScore))}/3 (높을수록 위험)`,
    `신뢰도: ${escapeHtml(truncateText(source.confidence, 40))}`,
    ...(isV2 ? [renderIndicators(weeklyReportOutput.facts.indicators)] : []),
    renderList("판단", coreChanges),
    renderThemes(themes),
    `<b>권장 대응</b>\n${escapeHtml(recommendedAction)}`
  ];

  if (source.confidence === "reduced") {
    sections.push("⚠️ 데이터 누락 또는 상충 신호로 판단 신뢰도가 낮아졌습니다.");
  }

  sections.push(NOTION_LOCATION, `※ ${DISCLOSURE}`);
  return sections.join("\n\n");
}

function qualityFailureMessage({ riskOutput, compact = false }) {
  const quality = riskOutput?.quality ?? {};
  const failedCoreIndicators = Array.isArray(quality.failedCoreIndicators)
    ? quality.failedCoreIndicators.slice(0, 5).map(({ indicatorId }) =>
        truncateText(indicatorId, compact ? 40 : 80)
      ).filter(Boolean)
    : [];
  const warningCodes = Array.isArray(quality.warnings)
    ? quality.warnings.slice(0, 3).map(({ code }) =>
        truncateText(code, compact ? 40 : 80)
      ).filter(Boolean)
    : [];

  return [
    "<b>⚠️ 주간 매크로 데이터 품질 실패</b>",
    `기준일: ${escapeHtml(truncateText(riskOutput?.asOf, 40))}`,
    "핵심 데이터 품질 기준을 충족하지 못해 AI 주간 보고서 생성과 Notion 저장을 생략했습니다.",
    renderList("실패한 핵심 지표", failedCoreIndicators),
    renderList("경고 코드", warningCodes)
  ].join("\n\n");
}

function requireObject(value, code, message) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TelegramSummaryError(code, message);
  }
}

function buildTelegramSummary({
  riskOutput,
  weeklyReportOutput = null,
  maxVisibleLength = MAX_TELEGRAM_VISIBLE_LENGTH
}) {
  requireObject(riskOutput, "TELEGRAM_RISK_OUTPUT_REQUIRED", "riskOutput is required.");
  const effectiveMaxVisibleLength = Number.isFinite(maxVisibleLength) && maxVisibleLength > 0
    ? Math.min(maxVisibleLength, MAX_TELEGRAM_VISIBLE_LENGTH)
    : MAX_TELEGRAM_VISIBLE_LENGTH;
  const qualityFailure = riskOutput.quality?.shouldAbort === true;

  if (!qualityFailure) {
    requireObject(
      weeklyReportOutput,
      "TELEGRAM_WEEKLY_REPORT_REQUIRED",
      "weeklyReportOutput is required for a weekly notification."
    );
  }

  const render = qualityFailure ? qualityFailureMessage : weeklyMessage;
  let text = render({ riskOutput, weeklyReportOutput });
  if (visibleTextLength(text) > effectiveMaxVisibleLength) {
    text = render({ riskOutput, weeklyReportOutput, compact: true });
  }
  assertWithinLimit(text, effectiveMaxVisibleLength);

  const asOf = qualityFailure ? riskOutput.asOf : weeklyReportOutput.asOf;
  return {
    text,
    notificationType: qualityFailure ? "quality_failure" : "weekly",
    asOf,
    deliveryKey: `${qualityFailure ? "telegram-quality" : "telegram-weekly"}:${asOf}`
  };
}

export {
  DISCLOSURE,
  MAX_TELEGRAM_VISIBLE_LENGTH,
  NOTION_LOCATION,
  STATUS_DISPLAY,
  TelegramSummaryError,
  buildTelegramSummary,
  escapeHtml,
  visibleTextLength
};
