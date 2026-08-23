import { isDeepStrictEqual } from "node:util";

import { buildReportFacts } from "./build-report-facts.js";

const ID_PATTERN = /^[a-z][a-z0-9_]*$/;
const PLACEHOLDERS = new Set(["---", "—", "N/A", "n/a", "unknown", "UNKNOWN"]);

function issue(instancePath, keyword, message) {
  return { instancePath, keyword, message };
}

function hasValidId(value) {
  return typeof value === "string" && ID_PATTERN.test(value) && !PLACEHOLDERS.has(value);
}

function hasValidName(value) {
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  return normalized.length > 0 && !PLACEHOLDERS.has(normalized);
}

function ids(items, idKey) {
  return (items ?? []).map((item) => item?.[idKey]);
}

function validateExactIds({ actualIds, expectedIds, path, errors }) {
  const duplicates = actualIds.filter((id, index) => actualIds.indexOf(id) !== index);
  if (duplicates.length > 0) {
    errors.push(issue(path, "duplicateId", `${path} contains duplicate IDs: ${[...new Set(duplicates)].join(", ")}.`));
  }

  const actualSet = new Set(actualIds);
  const expectedSet = new Set(expectedIds);
  const missing = expectedIds.filter((id) => !actualSet.has(id));
  const unknown = actualIds.filter((id) => !expectedSet.has(id));

  if (actualIds.length !== expectedIds.length || missing.length > 0 || unknown.length > 0) {
    errors.push(issue(
      path,
      "exactSet",
      `${path} must exactly match source IDs; missing=[${missing.join(", ")}], unknown=[${unknown.join(", ")}].`
    ));
  }
}

function validateRows({ rows, idKey, path, errors }) {
  for (const [index, row] of (rows ?? []).entries()) {
    if (!hasValidId(row?.[idKey])) {
      errors.push(issue(`${path}/${index}/${idKey}`, "id", `${idKey} must be a non-placeholder canonical ID.`));
    }
    if (Object.hasOwn(row ?? {}, "name") && !hasValidName(row.name)) {
      errors.push(issue(`${path}/${index}/name`, "name", "name must be non-empty and not a placeholder."));
    }
  }
}

export function validateReportFactsConsistency({
  reportFacts,
  indicatorOutputs,
  riskOutput,
  portfolioVulnerability,
  indicatorConfig,
  riskAreasConfig,
  thresholdsConfig
}) {
  const errors = [];
  const expectedIndicatorIds = Object.keys(indicatorConfig.indicators ?? {});
  const expectedAreaIds = Object.entries(riskAreasConfig.areas ?? {})
    .filter(([, area]) => area.enabled !== false)
    .map(([areaId]) => areaId);
  const expectedThemeIds = (portfolioVulnerability?.themeVulnerabilities ?? [])
    .slice(0, 3)
    .map(({ themeId }) => themeId);

  validateExactIds({
    actualIds: ids(indicatorOutputs, "indicatorId"),
    expectedIds: expectedIndicatorIds,
    path: "/source/indicatorOutputs",
    errors
  });
  validateExactIds({
    actualIds: ids(riskOutput?.indicatorStatuses, "indicatorId"),
    expectedIds: expectedIndicatorIds,
    path: "/source/riskOutput/indicatorStatuses",
    errors
  });
  validateExactIds({
    actualIds: ids(riskOutput?.areaRisks, "areaId"),
    expectedIds: expectedAreaIds,
    path: "/source/riskOutput/areaRisks",
    errors
  });

  validateRows({ rows: reportFacts?.indicators, idKey: "indicatorId", path: "/indicators", errors });
  validateRows({ rows: reportFacts?.areaRisks, idKey: "areaId", path: "/areaRisks", errors });
  validateRows({ rows: reportFacts?.portfolioThemes, idKey: "themeId", path: "/portfolioThemes", errors });
  validateExactIds({
    actualIds: ids(reportFacts?.indicators, "indicatorId"),
    expectedIds: expectedIndicatorIds,
    path: "/indicators",
    errors
  });
  validateExactIds({
    actualIds: ids(reportFacts?.areaRisks, "areaId"),
    expectedIds: expectedAreaIds,
    path: "/areaRisks",
    errors
  });
  validateExactIds({
    actualIds: ids(reportFacts?.portfolioThemes, "themeId"),
    expectedIds: expectedThemeIds,
    path: "/portfolioThemes",
    errors
  });

  const priorities = (reportFacts?.indicators ?? []).map(({ reportPriority }) => reportPriority);
  if (new Set(priorities).size !== priorities.length) {
    errors.push(issue("/indicators", "reportPriority", "Indicator reportPriority values must be unique."));
  }

  const contributionSum = (reportFacts?.indicators ?? []).reduce(
    (sum, { riskContribution }) => sum + (Number.isFinite(riskContribution) ? riskContribution : 0),
    0
  );
  if (
    typeof reportFacts?.overallRisk?.score === "number" &&
    Math.abs(contributionSum - reportFacts.overallRisk.score) > 1e-12
  ) {
    errors.push(issue(
      "/indicators",
      "riskContribution",
      "Scorable indicator riskContribution values must reproduce the overall weighted score."
    ));
  }

  let expectedFacts;
  try {
    expectedFacts = buildReportFacts({
      indicatorOutputs,
      riskOutput,
      portfolioVulnerability,
      indicatorConfig,
      thresholdsConfig
    });
  } catch (error) {
    errors.push(issue("", "sourceConsistency", error.message));
  }
  if (expectedFacts !== undefined && !isDeepStrictEqual(reportFacts, expectedFacts)) {
    errors.push(issue(
      "",
      "sourceConsistency",
      "reportFacts must exactly match deterministic indicator, risk, and portfolio sources."
    ));
  }

  return { valid: errors.length === 0, errors };
}

export function validateWeeklyAnalysisConsistency({ analysis, reportFacts }) {
  const errors = [];
  const expectedAreaIds = ids(reportFacts?.areaRisks, "areaId");
  const expectedThemeIds = ids(reportFacts?.portfolioThemes, "themeId");

  validateRows({ rows: analysis?.areaInsights, idKey: "areaId", path: "/areaInsights", errors });
  validateRows({ rows: analysis?.themeInsights, idKey: "themeId", path: "/themeInsights", errors });
  validateExactIds({
    actualIds: ids(analysis?.areaInsights, "areaId"),
    expectedIds: expectedAreaIds,
    path: "/areaInsights",
    errors
  });
  validateExactIds({
    actualIds: ids(analysis?.themeInsights, "themeId"),
    expectedIds: expectedThemeIds,
    path: "/themeInsights",
    errors
  });

  const allowedCandidateIds = new Set(
    (reportFacts?.portfolioThemes ?? []).flatMap(({ hedgeCandidateIds }) => hedgeCandidateIds ?? [])
  );
  const candidateIds = ids(analysis?.hedgeAndDefense?.candidates, "candidateId");
  const duplicateCandidateIds = candidateIds.filter((id, index) => candidateIds.indexOf(id) !== index);
  if (duplicateCandidateIds.length > 0) {
    errors.push(issue("/hedgeAndDefense/candidates", "duplicateId", "Hedge candidate IDs must be unique."));
  }
  for (const [index, candidateId] of candidateIds.entries()) {
    if (!hasValidId(candidateId) || !allowedCandidateIds.has(candidateId)) {
      errors.push(issue(
        `/hedgeAndDefense/candidates/${index}/candidateId`,
        "sourceId",
        `Unknown hedge candidate ID ${candidateId}.`
      ));
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateWeeklyReportConsistency({ weeklyReportOutput, macroReviewOutput }) {
  const errors = [];

  if (weeklyReportOutput?.asOf !== macroReviewOutput?.asOf) {
    errors.push(issue("/asOf", "sourceConsistency", "Weekly report asOf must match macro review asOf."));
  }
  if (!isDeepStrictEqual(weeklyReportOutput?.facts, macroReviewOutput?.reportFacts)) {
    errors.push(issue("/facts", "sourceConsistency", "Weekly report facts must deep-equal macro review reportFacts."));
  }

  const analysisConsistency = validateWeeklyAnalysisConsistency({
    analysis: weeklyReportOutput?.analysis,
    reportFacts: macroReviewOutput?.reportFacts
  });
  errors.push(...analysisConsistency.errors);

  return { valid: errors.length === 0, errors };
}
