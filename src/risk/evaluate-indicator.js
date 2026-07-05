function getValueByPath(source, path) {
  return path.split(".").reduce((current, key) => current?.[key], source);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function matchesRule(value, rule) {
  const operator = rule.when?.operator;
  const threshold = rule.when?.value;

  switch (operator) {
    case ">":
      return value > threshold;
    case ">=":
      return value >= threshold;
    case "<":
      return value < threshold;
    case "<=":
      return value <= threshold;
    case "==":
      return value === threshold;
    case "default":
      return true;
    default:
      throw new Error(`Unsupported threshold operator: ${operator}`);
  }
}

function evaluateMetric(output, metricConfig) {
  const value = getValueByPath(output, metricConfig.metricPath);

  if (!isFiniteNumber(value)) {
    return {
      metricPath: metricConfig.metricPath,
      unit: metricConfig.unit,
      value: null,
      status: "unavailable",
      score: null,
      matchedRuleId: null,
      signal: null
    };
  }

  const rules = metricConfig.rules ?? [];
  const nonDefaultMatches = rules.filter(
    (rule) => rule.when?.operator !== "default" && matchesRule(value, rule)
  );
  const matches = nonDefaultMatches.length > 0
    ? nonDefaultMatches
    : rules.filter((rule) => rule.when?.operator === "default");

  const selectedRule = matches.reduce((best, rule) => {
    if (!best) return rule;
    return rule.score > best.score ? rule : best;
  }, null);

  if (!selectedRule) {
    return {
      metricPath: metricConfig.metricPath,
      unit: metricConfig.unit,
      value,
      status: "unavailable",
      score: null,
      matchedRuleId: null,
      signal: null
    };
  }

  return {
    metricPath: metricConfig.metricPath,
    unit: metricConfig.unit,
    value,
    status: selectedRule.status,
    score: selectedRule.score,
    matchedRuleId: selectedRule.id,
    signal: selectedRule.signal ?? null
  };
}

function selectHighestScoreEvaluation(evaluations) {
  return evaluations
    .filter((evaluation) => isFiniteNumber(evaluation.score))
    .reduce((best, evaluation) => {
      if (!best) return evaluation;
      return evaluation.score > best.score ? evaluation : best;
    }, null);
}

export function evaluateIndicatorStatus({ indicatorOutput, thresholdsConfig }) {
  if (!indicatorOutput.available) {
    return {
      indicatorId: indicatorOutput.indicatorId,
      available: false,
      status: "unavailable",
      score: null,
      selectedEvaluation: null,
      evaluations: [],
      warnings: [
        {
          code: "INDICATOR_UNAVAILABLE",
          indicatorId: indicatorOutput.indicatorId,
          message: `${indicatorOutput.indicatorId} is unavailable and was not evaluated.`
        }
      ]
    };
  }

  const indicatorConfig = thresholdsConfig.indicators?.[indicatorOutput.indicatorId];
  if (!indicatorConfig?.enabled) {
    return {
      indicatorId: indicatorOutput.indicatorId,
      available: true,
      status: "unavailable",
      score: null,
      selectedEvaluation: null,
      evaluations: [],
      warnings: [
        {
          code: "THRESHOLD_CONFIG_MISSING",
          indicatorId: indicatorOutput.indicatorId,
          message: `${indicatorOutput.indicatorId} has no enabled threshold configuration.`
        }
      ]
    };
  }

  const evaluations = (indicatorConfig.activeMetrics ?? []).map((metricConfig) =>
    evaluateMetric(indicatorOutput, metricConfig)
  );
  const selectedEvaluation = selectHighestScoreEvaluation(evaluations);

  if (!selectedEvaluation) {
    return {
      indicatorId: indicatorOutput.indicatorId,
      available: true,
      status: "unavailable",
      score: null,
      selectedEvaluation: null,
      evaluations,
      warnings: [
        {
          code: "NO_THRESHOLD_MATCH",
          indicatorId: indicatorOutput.indicatorId,
          message: `${indicatorOutput.indicatorId} did not produce a usable threshold evaluation.`
        }
      ]
    };
  }

  return {
    indicatorId: indicatorOutput.indicatorId,
    available: true,
    status: selectedEvaluation.status,
    score: selectedEvaluation.score,
    selectedEvaluation,
    evaluations,
    warnings: []
  };
}

export function evaluateIndicatorStatuses({ indicatorOutputs, thresholdsConfig }) {
  return indicatorOutputs.map((indicatorOutput) =>
    evaluateIndicatorStatus({ indicatorOutput, thresholdsConfig })
  );
}
