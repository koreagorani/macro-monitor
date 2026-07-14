import { createNotionClientFromEnv, NotionClientError } from "../src/clients/notion-client.js";
import { OpenAIClientError } from "../src/clients/openai-client.js";
import { NotionReportPayloadError } from "../src/notion/build-notion-report-payload.js";
import { NotionReportSaveError, saveWeeklyReportToNotion } from "../src/notion/save-weekly-report-to-notion.js";
import { WeeklyReportGenerationError } from "../src/report/generate-weekly-report.js";
import { renderWeeklyReportMarkdown } from "../src/render/render-weekly-report-markdown.js";
import { generateLiveWeeklyReport } from "./run-weekly-report.js";

function fail(error) {
  console.error(JSON.stringify({
    code: error.code,
    message: error.message,
    ...(error.status === null || error.status === undefined ? {} : { status: error.status }),
    errors: error.errors ?? []
  }, null, 2));
  process.exitCode = 1;
}

try {
  const asOf = process.argv[2] ?? new Date().toISOString().slice(0, 10);
  const weeklyReportOutput = await generateLiveWeeklyReport({ asOf });
  const markdown = renderWeeklyReportMarkdown(weeklyReportOutput);
  const notionClient = createNotionClientFromEnv();
  const result = await saveWeeklyReportToNotion({ notionClient, weeklyReportOutput, markdown });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  if (
    error instanceof OpenAIClientError
    || error instanceof WeeklyReportGenerationError
    || error instanceof NotionClientError
    || error instanceof NotionReportPayloadError
    || error instanceof NotionReportSaveError
  ) {
    fail(error);
  } else {
    fail({
      code: "WEEKLY_REPORT_NOTION_SAVE_UNEXPECTED_ERROR",
      message: "Weekly report Notion save failed unexpectedly."
    });
  }
}
