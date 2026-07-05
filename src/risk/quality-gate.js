function toIndicatorMap(indicatorOutputs) {
  return new Map(indicatorOutputs.map((output) => [output.indicatorId, output]));
}

function getFailedIndicators(indicatorIds, indicatorMap) {
  return indicatorIds
    .map((indicatorId) => {
      const output = indicatorMap.get(indicatorId);
      if (!output) {
        return { indicatorId, reason: "missing_output" };
      }
      if (!output.available) {
        return { indicatorId, reason: "unavailable" };
      }
      return null;
    })
    .filter(Boolean);
}

function warningForFailedIndicator(failedIndicator, code) {
  return {
    code,
    indicatorId: failedIndicator.indicatorId,
    message: `${failedIndicator.indicatorId} is ${failedIndicator.reason}.`
  };
}

export function evaluateQualityGate({ indicatorOutputs, riskAreasConfig }) {
  const indicatorMap = toIndicatorMap(indicatorOutputs);
  const coreIndicatorIds = riskAreasConfig.coreIndicators ?? [];
  const nonCoreIndicatorIds = riskAreasConfig.nonCoreIndicators ?? [];
  const qualityGate = riskAreasConfig.qualityGate ?? {};

  const failedCoreIndicators = getFailedIndicators(coreIndicatorIds, indicatorMap);
  const failedNonCoreIndicators = getFailedIndicators(nonCoreIndicatorIds, indicatorMap);

  const abortThreshold = qualityGate.abortWhenFailedCoreIndicatorCountGreaterThanOrEqualTo ?? 2;
  const reducedThreshold = qualityGate.reducedConfidenceWhenFailedCoreIndicatorCountGreaterThanOrEqualTo ?? 1;

  const shouldAbort = failedCoreIndicators.length >= abortThreshold;
  const confidence = shouldAbort
    ? "aborted"
    : failedCoreIndicators.length >= reducedThreshold
      ? "reduced"
      : "normal";

  const warnings = [
    ...failedCoreIndicators.map((failedIndicator) =>
      warningForFailedIndicator(failedIndicator, "CORE_INDICATOR_UNAVAILABLE")
    ),
    ...failedNonCoreIndicators.map((failedIndicator) =>
      warningForFailedIndicator(failedIndicator, "NON_CORE_INDICATOR_UNAVAILABLE")
    )
  ];

  return {
    shouldAbort,
    confidence,
    coreIndicatorIds,
    nonCoreIndicatorIds,
    failedCoreIndicators,
    failedNonCoreIndicators,
    availableIndicatorCount: indicatorOutputs.filter((output) => output.available).length,
    unavailableIndicatorCount: indicatorOutputs.filter((output) => !output.available).length,
    warnings
  };
}
