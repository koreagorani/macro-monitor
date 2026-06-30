import {
  findLatestObservationOnOrBefore,
  normalizeFredObservations,
  subtractUtcDays
} from "./observations.js";

function percentChange(current, reference) {
  if (reference === 0) {
    throw new Error("Cannot calculate percent change from zero reference value");
  }
  return ((current / reference) - 1) * 100;
}

function basisPointDifference(current, reference, multiplier) {
  return (current - reference) * multiplier;
}

export function calculateMarketPriceMetrics({ observations, asOf, calculation }) {
  const normalized = normalizeFredObservations(observations);
  const weeklyTarget = subtractUtcDays(asOf, calculation.weeklyLookbackDays);
  const fourWeekTarget = subtractUtcDays(asOf, calculation.fourWeekLookbackDays);

  const current = findLatestObservationOnOrBefore(normalized, asOf);
  const weeklyReference = findLatestObservationOnOrBefore(normalized, weeklyTarget);
  const fourWeekReference = findLatestObservationOnOrBefore(normalized, fourWeekTarget);

  if (!current || !weeklyReference || !fourWeekReference) {
    throw new Error("Insufficient valid observations for current, weekly, or four-week comparison");
  }

  const calculateChange = calculation.method === "basis_point_difference"
    ? (value, reference) => basisPointDifference(
        value,
        reference,
        calculation.percentagePointToBasisPoint
      )
    : percentChange;

  return {
    currentValue: current.value,
    currentObservationDate: current.date,
    weeklyChange: calculateChange(current.value, weeklyReference.value),
    weeklyChangeUnit: calculation.changeUnit,
    weeklyReferenceDate: weeklyReference.date,
    fourWeekChange: calculateChange(current.value, fourWeekReference.value),
    fourWeekChangeUnit: calculation.changeUnit,
    fourWeekReferenceDate: fourWeekReference.date
  };
}
