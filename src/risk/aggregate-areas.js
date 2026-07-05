function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function classifyAreaStatus(score) {
  if (!isFiniteNumber(score)) return "unavailable";
  if (score < 0) return "easing";
  if (score < 0.5) return "normal";
  if (score < 1.5) return "watch";
  if (score < 2.5) return "alert";
  return "strong_alert";
}

function toIndicatorStatusMap(indicatorStatuses) {
  return new Map(indicatorStatuses.map((status) => [status.indicatorId, status]));
}

function getAreaLinks(areaId, indicatorAreaLinks) {
  return Object.entries(indicatorAreaLinks ?? {})
    .map(([indicatorId, areaWeights]) => ({
      indicatorId,
      areaWeight: areaWeights?.[areaId]
    }))
    .filter(({ areaWeight }) => isFiniteNumber(areaWeight) && areaWeight > 0);
}

function warningForExcludedIndicator({ indicatorId, areaId, reason }) {
  return {
    code: "AREA_INDICATOR_EXCLUDED",
    indicatorId,
    message: `${indicatorId} was excluded from ${areaId} area score because it is ${reason}.`
  };
}

function aggregateArea({ areaId, areaConfig, links, indicatorStatusMap }) {
  const warnings = [];
  const contributingIndicators = [];

  for (const link of links) {
    const indicatorStatus = indicatorStatusMap.get(link.indicatorId);

    if (!indicatorStatus) {
      warnings.push(warningForExcludedIndicator({
        indicatorId: link.indicatorId,
        areaId,
        reason: "missing"
      }));
      continue;
    }

    if (!indicatorStatus.available || indicatorStatus.status === "unavailable" || !isFiniteNumber(indicatorStatus.score)) {
      warnings.push(warningForExcludedIndicator({
        indicatorId: link.indicatorId,
        areaId,
        reason: "unavailable"
      }));
      continue;
    }

    contributingIndicators.push({
      indicatorId: link.indicatorId,
      status: indicatorStatus.status,
      score: indicatorStatus.score,
      areaWeight: link.areaWeight,
      weightedScore: indicatorStatus.score * link.areaWeight
    });
  }

  const totalWeight = contributingIndicators.reduce(
    (sum, contribution) => sum + contribution.areaWeight,
    0
  );
  const weightedScoreSum = contributingIndicators.reduce(
    (sum, contribution) => sum + contribution.weightedScore,
    0
  );
  const score = totalWeight > 0 ? weightedScoreSum / totalWeight : null;

  return {
    areaId,
    name: areaConfig.name,
    weight: areaConfig.weight,
    score,
    status: classifyAreaStatus(score),
    contributingIndicators,
    warnings
  };
}

export function aggregateAreaRisks({ indicatorStatuses, riskAreasConfig }) {
  const indicatorStatusMap = toIndicatorStatusMap(indicatorStatuses);
  const areas = Object.entries(riskAreasConfig.areas ?? {})
    .filter(([, areaConfig]) => areaConfig.enabled !== false);

  return areas.map(([areaId, areaConfig]) =>
    aggregateArea({
      areaId,
      areaConfig,
      links: getAreaLinks(areaId, riskAreasConfig.indicatorAreaLinks),
      indicatorStatusMap
    })
  );
}

export { classifyAreaStatus };
