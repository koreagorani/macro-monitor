import { saveWeeklyReportToNotion } from "../notion/save-weekly-report-to-notion.js";
import { renderWeeklyReportMarkdown } from "../render/render-weekly-report-markdown.js";
import { generateWeeklyReport, WeeklyReportGenerationError } from "../report/generate-weekly-report.js";
import { validateWeeklyReportOutput } from "../validation/validate-weekly-report-output.js";
import { buildTelegramSummary } from "./build-telegram-summary.js";

class TelegramNotificationError extends Error {
  constructor(code, message, { errors = [] } = {}) {
    super(message);
    this.name = "TelegramNotificationError";
    this.code = code;
    this.errors = errors;
  }
}

function compactErrors(errors = []) {
  return errors.map(({ instancePath, keyword, message }) => ({
    instancePath,
    keyword,
    message
  }));
}

function requireDependency(value, code, message) {
  if (!value) {
    throw new TelegramNotificationError(code, message);
  }
}

async function sendBuiltSummary({ telegramClient, summary }) {
  requireDependency(
    telegramClient,
    "TELEGRAM_CLIENT_REQUIRED",
    "Telegram client is required."
  );
  const result = await telegramClient.sendMessage({ text: summary.text });
  if (result?.delivered !== true) {
    throw new TelegramNotificationError(
      "TELEGRAM_DELIVERY_NOT_CONFIRMED",
      "Telegram delivery was not confirmed."
    );
  }
}

async function sendWeeklyReportNotification({
  macroReviewOutput,
  telegramClient,
  openaiClient = null,
  notionClient = null,
  generateWeeklyReportFn = generateWeeklyReport,
  validateWeeklyReportFn = validateWeeklyReportOutput,
  renderMarkdownFn = renderWeeklyReportMarkdown,
  saveToNotionFn = saveWeeklyReportToNotion,
  buildSummaryFn = buildTelegramSummary
}) {
  requireDependency(
    macroReviewOutput?.riskOutput,
    "TELEGRAM_MACRO_REVIEW_REQUIRED",
    "macroReviewOutput with riskOutput is required."
  );

  const riskOutput = macroReviewOutput.riskOutput;
  if (riskOutput.quality?.shouldAbort === true) {
    const summary = buildSummaryFn({ riskOutput });
    await sendBuiltSummary({ telegramClient, summary });
    return {
      status: "sent",
      notificationType: "quality_failure",
      asOf: summary.asOf,
      notionStatus: "skipped",
      verified: null
    };
  }

  requireDependency(openaiClient, "TELEGRAM_OPENAI_CLIENT_REQUIRED", "OpenAI client is required.");
  requireDependency(notionClient, "TELEGRAM_NOTION_CLIENT_REQUIRED", "Notion client is required.");

  const weeklyReportOutput = await generateWeeklyReportFn({
    macroReviewOutput,
    openaiClient
  });
  const validation = await validateWeeklyReportFn(weeklyReportOutput);
  if (!validation.valid) {
    throw new WeeklyReportGenerationError(
      "WEEKLY_REPORT_OUTPUT_SCHEMA_VALIDATION_FAILED",
      "Weekly report output failed final schema validation.",
      { errors: compactErrors(validation.errors) }
    );
  }

  const markdown = renderMarkdownFn(weeklyReportOutput);
  const notionResult = await saveToNotionFn({
    notionClient,
    weeklyReportOutput,
    markdown
  });

  if (notionResult?.verified !== true) {
    throw new TelegramNotificationError(
      "TELEGRAM_NOTION_SAVE_NOT_VERIFIED",
      "Telegram notification requires a verified Notion save."
    );
  }

  const summary = buildSummaryFn({ riskOutput, weeklyReportOutput });
  await sendBuiltSummary({ telegramClient, summary });

  return {
    status: "sent",
    notificationType: "weekly",
    asOf: summary.asOf,
    notionStatus: notionResult.status,
    verified: true
  };
}

export {
  TelegramNotificationError,
  sendWeeklyReportNotification
};
