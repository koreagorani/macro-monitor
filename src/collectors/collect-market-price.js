import { fetchFredObservations, FredApiError } from "../clients/fred-client.js";
import { calculateMarketPriceMetrics } from "../domain/market-price.js";

function toSafeError(error) {
  return {
    code: error?.code ?? "COLLECTION_ERROR",
    message: error instanceof FredApiError ? error.message : "Indicator collection failed"
  };
}

export async function collectMarketPriceIndicator({
  indicatorId,
  indicator,
  providerDefaults,
  asOf,
  apiKey,
  fetchImpl = fetch
}) {
  const outputBase = {
    indicatorId,
    name: indicator.name,
    type: indicator.type,
    asOf,
    unit: indicator.unit,
    status: null,
    source: indicator.source
  };

  try {
    const observationStart = new Date(`${asOf}T00:00:00Z`);
    observationStart.setUTCDate(
      observationStart.getUTCDate() - indicator.calculation.fourWeekLookbackDays - 10
    );

    const observations = await fetchFredObservations({
      apiBaseUrl: providerDefaults.apiBaseUrl,
      apiKey,
      seriesId: indicator.source.seriesId,
      observationStart: observationStart.toISOString().slice(0, 10),
      observationEnd: asOf,
      fileType: providerDefaults.fileType,
      fetchImpl
    });

    return {
      ...outputBase,
      available: true,
      metrics: calculateMarketPriceMetrics({
        observations,
        asOf,
        calculation: indicator.calculation
      }),
      error: null
    };
  } catch (error) {
    return {
      ...outputBase,
      available: false,
      metrics: null,
      error: toSafeError(error)
    };
  }
}
