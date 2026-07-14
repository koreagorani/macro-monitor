import { buildNotionReportPayload } from "./build-notion-report-payload.js";

class NotionReportSaveError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "NotionReportSaveError";
    this.code = code;
  }
}

const REQUIRED_DATA_SOURCE_PROPERTIES = {
  Name: "title",
  "Report Date": "date",
  "Generated At": "date",
  "Overall Risk": "select",
  "Overall Score": "number",
  Confidence: "select",
  "Schema Version": "rich_text",
  "Report Key": "rich_text"
};

function assertDataSourceSchema(dataSource) {
  const properties = dataSource?.properties ?? {};
  const mismatches = Object.entries(REQUIRED_DATA_SOURCE_PROPERTIES).flatMap(([name, expectedType]) => {
    const actualType = properties[name]?.type;
    if (actualType === expectedType) return [];
    return [`${name}:${actualType ?? "missing"}->${expectedType}`];
  });
  if (mismatches.length > 0) {
    throw new NotionReportSaveError(
      "NOTION_DATA_SOURCE_SCHEMA_MISMATCH",
      `Notion data source schema does not match the report contract: ${mismatches.join(", ")}.`
    );
  }
}

function plainText(items) {
  return Array.isArray(items)
    ? items.map((item) => item?.plain_text ?? item?.text?.content ?? "").join("")
    : "";
}

function readStoredMetadata(properties = {}) {
  return {
    title: plainText(properties.Name?.title),
    asOf: properties["Report Date"]?.date?.start ?? null,
    generatedAt: properties["Generated At"]?.date?.start ?? null,
    overallLevel: properties["Overall Risk"]?.select?.name ?? null,
    overallScore: properties["Overall Score"]?.number ?? null,
    confidence: properties.Confidence?.select?.name ?? null,
    schemaVersion: plainText(properties["Schema Version"]?.rich_text),
    reportKey: plainText(properties["Report Key"]?.rich_text)
  };
}

function sameScore(left, right) {
  return left === right || (typeof left === "number" && typeof right === "number" && Math.abs(left - right) < 1e-12);
}

function sameDateTime(left, right) {
  if (left === right) return true;
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  return Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime === rightTime;
}

function verifyReadBack({ page, pageMarkdown, expected }) {
  const stored = readStoredMetadata(page?.properties);
  const propertiesValid = stored.title === expected.title
    && stored.asOf === expected.asOf
    && sameDateTime(stored.generatedAt, expected.generatedAt)
    && stored.overallLevel === expected.overallLevel
    && sameScore(stored.overallScore, expected.overallScore)
    && stored.confidence === expected.confidence
    && stored.schemaVersion === expected.schemaVersion
    && stored.reportKey === expected.reportKey;
  const markdown = pageMarkdown?.markdown;
  const markdownValid = pageMarkdown?.truncated !== true
    && typeof markdown === "string"
    && markdown.includes(expected.title)
    && markdown.includes(expected.asOf)
    && markdown.includes(expected.disclosure);

  if (!propertiesValid || !markdownValid) {
    throw new NotionReportSaveError(
      "NOTION_READ_BACK_VERIFICATION_FAILED",
      "Saved Notion report did not pass metadata and Markdown verification."
    );
  }
}

async function saveWeeklyReportToNotion({ notionClient, weeklyReportOutput, markdown }) {
  const payload = buildNotionReportPayload({ weeklyReportOutput, markdown });
  const dataSource = await notionClient.retrieveDataSource();
  assertDataSourceSchema(dataSource);
  const matches = await notionClient.queryPagesByReportKey(payload.reportKey);

  if (matches.length > 1) {
    throw new NotionReportSaveError(
      "NOTION_DUPLICATE_REPORT_KEY",
      "More than one Notion page has the requested Report Key."
    );
  }

  let pageId;
  let status;
  if (matches.length === 0) {
    const created = await notionClient.createReportPage({
      properties: payload.properties,
      markdown: payload.markdown
    });
    pageId = created.id;
    status = "created";
  } else {
    pageId = matches[0].id;
    await notionClient.updatePageProperties({ pageId, properties: payload.properties });
    await notionClient.replacePageMarkdown({ pageId, markdown: payload.markdown });
    status = "updated";
  }

  const [page, pageMarkdown] = await Promise.all([
    notionClient.retrievePage(pageId),
    notionClient.retrievePageMarkdown(pageId)
  ]);
  verifyReadBack({ page, pageMarkdown, expected: payload.expected });

  return { status, asOf: payload.expected.asOf, verified: true };
}

export {
  NotionReportSaveError,
  REQUIRED_DATA_SOURCE_PROPERTIES,
  assertDataSourceSchema,
  readStoredMetadata,
  saveWeeklyReportToNotion,
  verifyReadBack
};
