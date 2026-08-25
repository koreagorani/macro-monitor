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

function sameDateTime(left, right, toleranceMs = 0) {
  if (left === right) return true;
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  return Number.isFinite(leftTime)
    && Number.isFinite(rightTime)
    && Math.abs(leftTime - rightTime) <= toleranceMs;
}

function hasGfmTableSeparator(markdown) {
  return /^\s*\|(?:\s*:?-{3,}:?\s*\|){2,}\s*$/m.test(markdown);
}

function hasPlaceholderTableRow(markdown) {
  const tableRows = markdown.match(/<tr(?:\s[^>]*)?>[\s\S]*?<\/tr>/gi) ?? [];
  return tableRows.some((row) => {
    const cells = [...row.matchAll(/<td(?:\s[^>]*)?>([\s\S]*?)<\/td>/gi)]
      .map((match) => match[1].trim());
    return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
  });
}

function readBackMismatches({ page, pageMarkdown, expected }) {
  const stored = readStoredMetadata(page?.properties);
  const markdown = pageMarkdown?.markdown;
  const checks = {
    "property.Name": stored.title === expected.title,
    "property.Report Date": stored.asOf === expected.asOf,
    "property.Generated At": sameDateTime(stored.generatedAt, expected.generatedAt, 60_000),
    "property.Overall Risk": stored.overallLevel === expected.overallLevel,
    "property.Overall Score": sameScore(stored.overallScore, expected.overallScore),
    "property.Confidence": stored.confidence === expected.confidence,
    "property.Schema Version": stored.schemaVersion === expected.schemaVersion,
    "property.Report Key": stored.reportKey === expected.reportKey,
    "markdown.notTruncated": pageMarkdown?.truncated !== true,
    "markdown.present": typeof markdown === "string",
    "markdown.title": typeof markdown === "string" && markdown.includes(expected.title),
    "markdown.asOf": typeof markdown === "string" && markdown.includes(expected.asOf),
    "markdown.disclosure": typeof markdown === "string" && markdown.includes(expected.disclosure),
    "markdown.gfmTableSeparatorAbsent": typeof markdown === "string" && !hasGfmTableSeparator(markdown),
    "markdown.placeholderTableRowAbsent": typeof markdown === "string" && !hasPlaceholderTableRow(markdown)
  };

  if (expected.dataFirstCoverage) {
    checks["markdown.indicatorSection"] = typeof markdown === "string"
      && markdown.includes(expected.dataFirstCoverage.sectionHeading);
    checks["markdown.corePceObservationLabel"] = typeof markdown === "string"
      && markdown.includes("관측일");
    checks["markdown.corePceReferenceMonthLabel"] = typeof markdown === "string"
      && markdown.includes("기준월");
    if (expected.dataFirstCoverage.corePceObservationDate !== null) {
      checks["markdown.corePceObservationDate"] = typeof markdown === "string"
        && markdown.includes(expected.dataFirstCoverage.corePceObservationDate);
    }
    if (expected.dataFirstCoverage.corePceReferenceMonth !== null) {
      checks["markdown.corePceReferenceMonth"] = typeof markdown === "string"
        && markdown.includes(expected.dataFirstCoverage.corePceReferenceMonth);
    }
    for (const indicator of expected.dataFirstCoverage.indicatorCoverage) {
      checks[`markdown.indicator.${indicator.indicatorId}`] = typeof markdown === "string"
        && markdown.includes(`<td>${indicator.name}</td>`);
    }
  }
  return Object.entries(checks).filter(([, valid]) => !valid).map(([name]) => name);
}

function verifyReadBack({ page, pageMarkdown, expected }) {
  const mismatches = readBackMismatches({ page, pageMarkdown, expected });
  if (mismatches.length > 0) {
    throw new NotionReportSaveError(
      "NOTION_READ_BACK_VERIFICATION_FAILED",
      `Saved Notion report did not pass read-back verification: ${mismatches.join(", ")}.`
    );
  }
}

async function saveWeeklyReportToNotion({
  notionClient,
  weeklyReportOutput,
  markdown,
  readBackAttempts = 3,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
}) {
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

  let lastError;
  for (let attempt = 0; attempt < readBackAttempts; attempt += 1) {
    const [page, pageMarkdown] = await Promise.all([
      notionClient.retrievePage(pageId),
      notionClient.retrievePageMarkdown(pageId)
    ]);
    try {
      verifyReadBack({ page, pageMarkdown, expected: payload.expected });
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      if (attempt + 1 < readBackAttempts) {
        await sleep(500 * (attempt + 1));
      }
    }
  }
  if (lastError) throw lastError;

  return { status, asOf: payload.expected.asOf, verified: true };
}

export {
  NotionReportSaveError,
  REQUIRED_DATA_SOURCE_PROPERTIES,
  assertDataSourceSchema,
  hasGfmTableSeparator,
  hasPlaceholderTableRow,
  readBackMismatches,
  readStoredMetadata,
  saveWeeklyReportToNotion,
  verifyReadBack
};
