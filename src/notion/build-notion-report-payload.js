class NotionReportPayloadError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "NotionReportPayloadError";
    this.code = code;
  }
}

function requireText(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new NotionReportPayloadError(
      "NOTION_REPORT_METADATA_INVALID",
      `Weekly report metadata field ${field} is required.`
    );
  }
  return value;
}

function textValue(content) {
  return [{ type: "text", text: { content } }];
}

function buildNotionReportPayload({ weeklyReportOutput, markdown }) {
  const source = weeklyReportOutput?.sourceMacroReview ?? {};
  const title = requireText(weeklyReportOutput?.report?.title, "report.title");
  const asOf = requireText(weeklyReportOutput?.asOf, "asOf");
  const generatedAt = requireText(weeklyReportOutput?.generatedAt, "generatedAt");
  const schemaVersion = requireText(weeklyReportOutput?.schemaVersion, "schemaVersion");
  const overallLevel = requireText(source.overallLevel, "sourceMacroReview.overallLevel");
  const confidence = requireText(source.confidence, "sourceMacroReview.confidence");
  const disclosure = requireText(weeklyReportOutput?.report?.mandatoryDisclosure, "report.mandatoryDisclosure");
  requireText(markdown, "markdown");

  if (source.overallScore !== null && typeof source.overallScore !== "number") {
    throw new NotionReportPayloadError(
      "NOTION_REPORT_METADATA_INVALID",
      "Weekly report metadata field sourceMacroReview.overallScore must be a number or null."
    );
  }

  const reportKey = `weekly-report:${asOf}`;
  return {
    reportKey,
    markdown,
    properties: {
      Name: { title: textValue(title) },
      "Report Date": { date: { start: asOf } },
      "Generated At": { date: { start: generatedAt } },
      "Overall Risk": { select: { name: overallLevel } },
      "Overall Score": { number: source.overallScore },
      Confidence: { select: { name: confidence } },
      "Schema Version": { rich_text: textValue(schemaVersion) },
      "Report Key": { rich_text: textValue(reportKey) }
    },
    expected: { title, asOf, generatedAt, overallLevel, overallScore: source.overallScore, confidence, schemaVersion, reportKey, disclosure }
  };
}

export { NotionReportPayloadError, buildNotionReportPayload };
