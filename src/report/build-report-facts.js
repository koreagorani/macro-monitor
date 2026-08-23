function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function warningFacts(...warningGroups) {
  return warningGroups
    .flat()
    .filter(Boolean)
    .map(({ code, message }) => ({ code, message }));
}

function thresholdForEvaluation({ indicatorId, evaluation, thresholdsConfig }) {
  if (!evaluation) return null;

  const metricConfig = (thresholdsConfig.indicators?.[indicatorId]?.activeMetrics ?? [])
    .find(({ metricPath }) => metricPath === evaluation.metricPath);
  const matchedRule = (metricConfig?.rules ?? [])
    .find(({ id }) => id === evaluation.matchedRuleId);

  return {
    ...clone(evaluation),
    threshold: {
      operator: matchedRule?.when?.operator ?? "default",
      value: isFiniteNumber(matchedRule?.when?.value) ? matchedRule.when.value : null
    }
  };
}

const STATUS_LABELS = {
  easing: "완화",
  normal: "정상",
  watch: "주의",
  alert: "경계",
  strong_alert: "강한 경계",
  unavailable: "사용 불가"
};

const METRIC_LABELS = {
  "metrics.weeklyChange": "주간 변화",
  "metrics.fourWeekChange": "4주 변화",
  "metrics.currentMoM": "전월비",
  "metrics.threeMonthAverageMoM": "3개월 평균"
};

function buildFactNote(indicatorStatus) {
  if (!indicatorStatus?.available || indicatorStatus.status === "unavailable") {
    return "데이터 사용 불가";
  }

  const metricLabel = METRIC_LABELS[indicatorStatus.selectedEvaluation?.metricPath] ?? "선택 지표";
  const statusLabel = STATUS_LABELS[indicatorStatus.status] ?? indicatorStatus.status;
  return `${metricLabel} 기준 ${statusLabel}`;
}

export function calculateIndicatorRiskContributions({ areaRisks }) {
  const scorableAreas = (areaRisks ?? []).filter(
    ({ score, weight }) => isFiniteNumber(score) && isFiniteNumber(weight) && weight > 0
  );
  const totalAreaWeight = scorableAreas.reduce((sum, { weight }) => sum + weight, 0);
  const contributions = new Map();

  if (totalAreaWeight === 0) return contributions;

  for (const areaRisk of scorableAreas) {
    const contributingIndicators = (areaRisk.contributingIndicators ?? []).filter(
      ({ areaWeight, weightedScore }) =>
        isFiniteNumber(areaWeight) && areaWeight > 0 && isFiniteNumber(weightedScore)
    );
    const totalIndicatorWeight = contributingIndicators.reduce(
      (sum, { areaWeight }) => sum + areaWeight,
      0
    );

    if (totalIndicatorWeight === 0) continue;

    for (const contribution of contributingIndicators) {
      const overallContribution =
        (areaRisk.weight / totalAreaWeight) *
        (contribution.weightedScore / totalIndicatorWeight);
      contributions.set(
        contribution.indicatorId,
        (contributions.get(contribution.indicatorId) ?? 0) + overallContribution
      );
    }
  }

  return contributions;
}

function commonIndicatorFact({
  indicatorOutput,
  indicatorStatus,
  indicatorConfig,
  thresholdsConfig,
  riskContribution
}) {
  return {
    indicatorId: indicatorOutput.indicatorId,
    name: indicatorOutput.name,
    type: indicatorOutput.type,
    unit: indicatorOutput.unit,
    available: indicatorOutput.available,
    status: indicatorStatus?.status ?? "unavailable",
    score: indicatorStatus?.score ?? null,
    reportPriority: indicatorConfig.reportPriority,
    riskContribution: indicatorStatus?.status === "unavailable"
      ? null
      : (riskContribution ?? 0),
    factNote: buildFactNote(indicatorStatus),
    selectedEvaluation: thresholdForEvaluation({
      indicatorId: indicatorOutput.indicatorId,
      evaluation: indicatorStatus?.selectedEvaluation ?? null,
      thresholdsConfig
    })
  };
}

function buildIndicatorFact(args) {
  const common = commonIndicatorFact(args);
  const metrics = args.indicatorOutput.metrics ?? {};

  if (args.indicatorOutput.type === "market_price") {
    return {
      ...common,
      currentValue: metrics.currentValue ?? null,
      currentObservationDate: metrics.currentObservationDate ?? null,
      weeklyChange: metrics.weeklyChange ?? null,
      weeklyChangeUnit: metrics.weeklyChangeUnit ?? null,
      weeklyReferenceDate: metrics.weeklyReferenceDate ?? null,
      fourWeekChange: metrics.fourWeekChange ?? null,
      fourWeekChangeUnit: metrics.fourWeekChangeUnit ?? null,
      fourWeekReferenceDate: metrics.fourWeekReferenceDate ?? null
    };
  }

  return {
    ...common,
    currentObservationDate: metrics.currentObservationDate ?? null,
    referenceMonth: metrics.referenceMonth ?? null,
    currentMoM: metrics.currentMoM ?? null,
    previousMoM: metrics.previousMoM ?? null,
    threeMonthAverageMoM: metrics.threeMonthAverageMoM ?? null,
    consensusMoM: metrics.consensusMoM ?? null
  };
}

export function buildReportFacts({
  indicatorOutputs,
  riskOutput,
  portfolioVulnerability,
  indicatorConfig,
  thresholdsConfig
}) {
  if (riskOutput.quality?.shouldAbort) return null;
  if (!riskOutput.overallRisk || !portfolioVulnerability) {
    throw new Error("Normal report facts require overall risk and portfolio vulnerability outputs.");
  }

  const statusByIndicatorId = new Map(
    (riskOutput.indicatorStatuses ?? []).map((status) => [status.indicatorId, status])
  );
  const riskContributions = calculateIndicatorRiskContributions({
    areaRisks: riskOutput.areaRisks
  });

  const indicators = indicatorOutputs.map((indicatorOutput) => {
    const configuredIndicator = indicatorConfig.indicators?.[indicatorOutput.indicatorId];
    const indicatorStatus = statusByIndicatorId.get(indicatorOutput.indicatorId);
    if (!configuredIndicator) {
      throw new Error(`Missing indicator config for ${indicatorOutput.indicatorId}.`);
    }
    if (!indicatorStatus) {
      throw new Error(`Missing risk status for ${indicatorOutput.indicatorId}.`);
    }

    return buildIndicatorFact({
      indicatorOutput,
      indicatorStatus,
      indicatorConfig: configuredIndicator,
      thresholdsConfig,
      riskContribution: riskContributions.get(indicatorOutput.indicatorId)
    });
  });

  const areaRisks = (riskOutput.areaRisks ?? []).map(({
    areaId,
    name,
    weight,
    score,
    status,
    contributingIndicators
  }) => ({
    areaId,
    name,
    weight,
    score,
    status,
    contributingIndicators: clone(contributingIndicators)
  }));

  const portfolioThemes = (portfolioVulnerability.themeVulnerabilities ?? []).map(({
    themeId,
    name,
    description,
    score,
    level,
    macroContributions,
    reasons,
    confidence,
    hedgeCandidateIds
  }) => ({
    themeId,
    name,
    description,
    score,
    level,
    macroContributions: clone(macroContributions),
    reasons: clone(reasons),
    confidence,
    hedgeCandidateIds: clone(hedgeCandidateIds)
  }));

  return {
    schemaVersion: "1.0.0",
    asOf: riskOutput.asOf,
    overallRisk: clone(riskOutput.overallRisk),
    indicators,
    areaRisks,
    portfolioThemes,
    warnings: warningFacts(riskOutput.warnings, portfolioVulnerability.warnings)
  };
}
