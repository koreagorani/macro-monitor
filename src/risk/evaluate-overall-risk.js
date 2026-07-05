const LEVEL_LABELS = {
  normal: "정상",
  watch: "주의",
  alert: "경계",
  high_risk: "높은 위험"
};

const WORSENING_STATUSES = new Set(["watch", "alert", "strong_alert"]);
const ALERT_STATUSES = new Set(["alert", "strong_alert"]);
const WATCH_ONLY_STATUSES = new Set(["watch"]);

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function areaMap(areaRisks) {
  return new Map(areaRisks.map((areaRisk) => [areaRisk.areaId, areaRisk]));
}

function isWorsening(areaRisk) {
  return WORSENING_STATUSES.has(areaRisk?.status);
}

function isAlertOrWorse(areaRisk) {
  return ALERT_STATUSES.has(areaRisk?.status);
}

function calculateWeightedScore(areaRisks) {
  const scorableAreas = areaRisks.filter(
    (areaRisk) => isFiniteNumber(areaRisk.score) && isFiniteNumber(areaRisk.weight) && areaRisk.weight > 0
  );
  const totalWeight = scorableAreas.reduce((sum, areaRisk) => sum + areaRisk.weight, 0);

  if (totalWeight === 0) return null;

  const weightedScore = scorableAreas.reduce(
    (sum, areaRisk) => sum + (areaRisk.score * areaRisk.weight),
    0
  );

  return weightedScore / totalWeight;
}

function countAreas(areaRisks, predicate) {
  return areaRisks.filter(predicate).length;
}

function buildReasons({ level, alertAreas, watchAreas, rules }) {
  const reasons = [];

  if (rules.includes("HIGH_RISK_RATES_INFLATION_RISK_APPETITE_WORSENING")) {
    reasons.push("금리·인플레이션·위험선호 영역이 동시에 악화되었습니다.");
  }
  if (rules.includes("ALERT_TWO_DISTINCT_AREAS_ALERT")) {
    reasons.push(`서로 다른 ${alertAreas.length}개 영역이 경계 이상입니다.`);
  }
  if (rules.includes("ALERT_RATES_AND_RISK_APPETITE_WORSENING")) {
    reasons.push("금리·통화정책과 위험선호가 동시에 악화되었습니다.");
  }
  if (rules.includes("WATCH_ONE_AREA_ALERT")) {
    reasons.push("한 영역이 경계 이상입니다.");
  }
  if (rules.includes("WATCH_TWO_AREAS_WATCH")) {
    reasons.push(`주의 이상 영역이 ${watchAreas.length}개입니다.`);
  }
  if (rules.includes("NORMAL_NO_ALERT_AND_AT_MOST_ONE_WATCH")) {
    reasons.push("경계 영역이 없고 주의 영역이 1개 이하입니다.");
  }

  if (reasons.length === 0) {
    reasons.push(`${LEVEL_LABELS[level]} 단계로 판정되었습니다.`);
  }

  return reasons;
}

export function evaluateOverallRisk({ areaRisks, quality }) {
  if (quality?.shouldAbort) {
    return null;
  }

  const byArea = areaMap(areaRisks);
  const ratesPolicy = byArea.get("rates_policy");
  const inflationSupply = byArea.get("inflation_supply");
  const riskAppetite = byArea.get("risk_appetite");

  const alertAreas = areaRisks.filter(isAlertOrWorse);
  const watchOrWorseAreas = areaRisks.filter(isWorsening);
  const watchOnlyCount = countAreas(areaRisks, (areaRisk) => WATCH_ONLY_STATUSES.has(areaRisk.status));
  const weightedScore = calculateWeightedScore(areaRisks);

  let level = "normal";
  let triggeredRules = [];

  if (isWorsening(ratesPolicy) && isWorsening(inflationSupply) && isWorsening(riskAppetite)) {
    level = "high_risk";
    triggeredRules = ["HIGH_RISK_RATES_INFLATION_RISK_APPETITE_WORSENING"];
  } else if (alertAreas.length >= 2) {
    level = "alert";
    triggeredRules = ["ALERT_TWO_DISTINCT_AREAS_ALERT"];
  } else if (isWorsening(ratesPolicy) && isWorsening(riskAppetite)) {
    level = "alert";
    triggeredRules = ["ALERT_RATES_AND_RISK_APPETITE_WORSENING"];
  } else if (alertAreas.length === 1) {
    level = "watch";
    triggeredRules = ["WATCH_ONE_AREA_ALERT"];
  } else if (watchOrWorseAreas.length >= 2 || watchOnlyCount >= 2) {
    level = "watch";
    triggeredRules = ["WATCH_TWO_AREAS_WATCH"];
  } else {
    level = "normal";
    triggeredRules = ["NORMAL_NO_ALERT_AND_AT_MOST_ONE_WATCH"];
  }

  return {
    level,
    score: weightedScore,
    label: LEVEL_LABELS[level],
    reasons: buildReasons({
      level,
      alertAreas,
      watchAreas: watchOrWorseAreas,
      rules: triggeredRules
    }),
    triggeredRules,
    confidence: quality?.confidence ?? "normal"
  };
}

export { calculateWeightedScore };
