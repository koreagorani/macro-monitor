import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { OpenAIClientError } from "../src/clients/openai-client.js";
import { WeeklyReportGenerationError } from "../src/report/generate-weekly-report.js";
import { renderWeeklyReportMarkdown } from "../src/render/render-weekly-report-markdown.js";
import { generateLiveWeeklyReport } from "./run-weekly-report.js";

function fail({ code, message, errors = [] }) {
  console.error(JSON.stringify({
    code,
    message,
    errors
  }, null, 2));
  process.exitCode = 1;
}

try {
  const asOf = process.argv[2] ?? new Date().toISOString().slice(0, 10);
  const weeklyReportOutput = await generateLiveWeeklyReport({ asOf });
  const markdown = renderWeeklyReportMarkdown(weeklyReportOutput);
  const outputPath = process.env.REPORT_MARKDOWN_OUTPUT?.trim();

  if (outputPath) {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, markdown, "utf8");
    console.log(JSON.stringify({
      status: "written",
      outputPath,
      asOf: weeklyReportOutput.asOf,
      characterCount: markdown.length
    }, null, 2));
  } else {
    process.stdout.write(markdown);
  }
} catch (error) {
  if (error instanceof OpenAIClientError || error instanceof WeeklyReportGenerationError) {
    fail({
      code: error.code,
      message: error.message,
      errors: error.errors ?? []
    });
  } else {
    fail({
      code: "WEEKLY_REPORT_MARKDOWN_RENDER_UNEXPECTED_ERROR",
      message: "Weekly report Markdown rendering failed unexpectedly."
    });
  }
}
