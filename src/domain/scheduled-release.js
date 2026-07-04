import { normalizeFredObservations } from "./observations.js";

function monthOverMonthPercentChange(current, previous) {
  if (previous === 0) {
    throw new Error("Cannot calculate month-over-month change from zero reference value");
  }
  return ((current / previous) - 1) * 100;
}

function toReferenceMonth(observationDate) {
  return observationDate.slice(0, 7);
}

export function calculateCorePceMetrics({ observations, calculation }) {
  const normalized = normalizeFredObservations(observations);

  const requiredObservationCount = calculation.threeMonthAveragePeriods + 1;
  if (normalized.length < requiredObservationCount) {
    throw new Error("Insufficient valid observations for core PCE month-over-month calculation");
  }

  const latestObservations = normalized.slice(-requiredObservationCount);
  const momValues = [];

  for (let index = 1; index < latestObservations.length; index += 1) {
    momValues.push(monthOverMonthPercentChange(
      latestObservations[index].value,
      latestObservations[index - 1].value
    ));
  }

  const currentObservation = latestObservations.at(-1);
  const currentMoM = momValues.at(-1);
  const previousMoM = momValues.at(-2);
  const threeMonthAverageMoM = momValues.reduce((sum, value) => sum + value, 0) / momValues.length;

  return {
    currentMoM,
    previousMoM,
    threeMonthAverageMoM,
    consensusMoM: calculation.consensusDefault ?? null,
    referenceMonth: toReferenceMonth(currentObservation.date),
    currentObservationDate: currentObservation.date
  };
}
