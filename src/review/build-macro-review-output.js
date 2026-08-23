function warning(code, message) {
  return { code, message };
}

function buildDataSourceSummary({ riskOutput, portfolioVulnerability }) {
  const quality = riskOutput.quality ?? {};
  const indicatorStatuses = riskOutput.indicatorStatuses ?? [];

  return {
    source: "fred_live_collection",
    riskAsOf: riskOutput.asOf,
    indicatorCount: indicatorStatuses.length,
    availableIndicatorCount: quality.availableIndicatorCount ?? indicatorStatuses.filter((status) => status.available).length,
    unavailableIndicatorCount: quality.unavailableIndicatorCount ?? indicatorStatuses.filter((status) => !status.available).length,
    riskQualityConfidence: quality.confidence ?? "normal",
    riskShouldAbort: Boolean(quality.shouldAbort),
    portfolioVulnerabilityCalculated: portfolioVulnerability !== null
  };
}

export function buildMacroReviewOutput({
  riskOutput,
  portfolioVulnerability,
  reportFacts,
  generatedAt = new Date().toISOString()
}) {
  const warnings = [];

  if (!riskOutput.quality?.shouldAbort && !reportFacts) {
    throw new Error("Normal macro review output requires deterministic report facts.");
  }

  if (riskOutput.quality?.shouldAbort) {
    warnings.push(warning(
      "MACRO_REVIEW_PORTFOLIO_SKIPPED",
      "Portfolio vulnerability calculation was skipped because risk-output quality gate requested abort."
    ));
  }

  if (riskOutput.quality?.confidence === "reduced") {
    warnings.push(warning(
      "MACRO_REVIEW_REDUCED_CONFIDENCE",
      "Risk-output quality confidence is reduced; downstream portfolio vulnerability should be interpreted with lower confidence."
    ));
  }

  return {
    schemaVersion: "2.0.0",
    asOf: riskOutput.asOf,
    generatedAt,
    dataSourceSummary: buildDataSourceSummary({ riskOutput, portfolioVulnerability }),
    riskOutput,
    portfolioVulnerability,
    reportFacts: riskOutput.quality?.shouldAbort ? null : reportFacts,
    warnings
  };
}
