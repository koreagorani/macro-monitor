const MAX_TELEGRAM_VISIBLE_LENGTH = 3_500;
const DISCLOSURE = "취약도는 기대수익률이나 직접적인 매도 신호가 아니라 매크로 노출도입니다.";
const NOTION_LOCATION = "전체 보고서: Notion의 Macro Weekly Reports에서 확인";

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
        const level = escapeHtml(theme.level);
        const score = escapeHtml(theme.score);
        return `${index + 1}. ${name} — ${level} / ${score}`;
      })
    : ["• 없음"];
  return ["<b>취약 테마</b>", ...lines].join("\n");
}

function normalizeCoreChanges(weeklyReportOutput, maxItemLength) {
  const changes = weeklyReportOutput?.report?.oneLookConclusion?.coreChanges;
  return Array.isArray(changes)
    ? changes.slice(0, 3).map((change) => truncateText(change, maxItemLength)).filter(Boolean)
    : [];
}

function normalizeThemes(weeklyReportOutput, maxNameLength) {
  const themes = weeklyReportOutput?.report?.portfolioThemes;
  return Array.isArray(themes)
    ? themes.slice(0, 3).map((theme) => ({
        name: truncateText(theme?.name, maxNameLength) || "이름 없음",
        level: truncateText(theme?.level, 40) || "unknown",
        score: theme?.score === null || theme?.score === undefined ? "null" : String(theme.score)
      }))
    : [];
}

function weeklyMessage({ weeklyReportOutput, compact = false }) {
  const source = weeklyReportOutput?.sourceMacroReview ?? {};
  const conclusion = weeklyReportOutput?.report?.oneLookConclusion ?? {};
  const warningTitle = source.overallLevel === "alert" || source.overallLevel === "high_risk";
  const coreChanges = normalizeCoreChanges(weeklyReportOutput, compact ? 120 : 240);
  const themes = normalizeThemes(weeklyReportOutput, compact ? 60 : 100);
  const recommendedAction = truncateText(conclusion.recommendedAction, compact ? 100 : 160) || "없음";
  const sections = [
    warningTitle ? "<b>⚠️ 주간 매크로 경고</b>" : "<b>주간 매크로 요약</b>",
    `기준일: ${escapeHtml(truncateText(weeklyReportOutput?.asOf, 40))}`,
    `전체 위험 단계: ${escapeHtml(truncateText(source.overallLevel, 40))}`,
    `전체 위험 점수: ${escapeHtml(source.overallScore)}`,
    `신뢰도: ${escapeHtml(truncateText(source.confidence, 40))}`,
    renderList("핵심 변화", coreChanges),
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
  TelegramSummaryError,
  buildTelegramSummary,
  escapeHtml,
  visibleTextLength
};
