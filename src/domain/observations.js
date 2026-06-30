function isValidDateString(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function normalizeFredObservations(observations) {
  return observations
    .filter((item) => isValidDateString(item?.date))
    .map((item) => ({
      date: item.date,
      value: Number(item.value)
    }))
    .filter((item) => Number.isFinite(item.value))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function findLatestObservationOnOrBefore(observations, targetDate) {
  if (!isValidDateString(targetDate)) {
    throw new Error(`Invalid target date: ${targetDate}`);
  }

  let match = null;
  for (const observation of observations) {
    if (observation.date > targetDate) break;
    match = observation;
  }
  return match;
}

export function subtractUtcDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateString}`);
  }
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}
