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
  const isV2 = weeklyReportOutput?.schemaVersion === "2.0.0";
  const source = isV2
    ? weeklyReportOutput?.facts?.overallRisk ?? {}
    : (weeklyReportOutput?.sourceMacroReview ?? {});
  const title = requireText(
    isV2 ? weeklyReportOutput?.presentation?.title : weeklyReportOutput?.report?.title,
    isV2 ? "presentation.title" : "report.title"
  );
  const asOf = requireText(weeklyReportOutput?.asOf, "asOf");
  const generatedAt = requireText(weeklyReportOutput?.generatedAt, "generatedAt");
  const schemaVersion = requireText(weeklyReportOutput?.schemaVersion, "schemaVersion");
  const overallLevel = requireText(isV2 ? source.level : source.overallLevel, isV2 ? "facts.overallRisk.level" : "sourceMacroReview.overallLevel");
  const confidence = requireText(source.confidence, isV2 ? "facts.overallRisk.confidence" : "sourceMacroReview.confidence");
  const disclosure = requireText(
    isV2 ? weeklyReportOutput?.presentation?.mandatoryDisclosure : weeklyReportOutput?.report?.mandatoryDisclosure,
    isV2 ? "presentation.mandatoryDisclosure" : "report.mandatoryDisclosure"
  );
  requireText(markdown, "markdown");

  const overallScore = isV2 ? source.score : source.overallScore;
  if (overallScore !== null && typeof overallScore !== "number") {
    throw new NotionReportPayloadError(
      "NOTION_REPORT_METADATA_INVALID",
      `Weekly report metadata field ${isV2 ? "facts.overallRisk.score" : "sourceMacroReview.overallScore"} must be a number or null.`
    );
  }

  const reportKey = `weekly-report:${asOf}`;
  return {
    reportKey,
    markdown,
    properties: {
      Name: { type: "title", title: textValue(title) },
      "Report Date": { type: "date", date: { start: asOf } },
      "Generated At": { type: "date", date: { start: generatedAt } },
      "Overall Risk": { type: "select", select: { name: overallLevel } },
      "Overall Score": { type: "number", number: overallScore },
      Confidence: { type: "select", select: { name: confidence } },
      "Schema Version": { type: "rich_text", rich_text: textValue(schemaVersion) },
      "Report Key": { type: "rich_text", rich_text: textValue(reportKey) }
    },
    expected: { title, asOf, generatedAt, overallLevel, overallScore, confidence, schemaVersion, reportKey, disclosure }
  };
}

export { NotionReportPayloadError, buildNotionReportPayload };
