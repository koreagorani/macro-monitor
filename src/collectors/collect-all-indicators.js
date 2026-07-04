import { collectMarketPriceIndicators } from "./collect-market-prices.js";
import { collectScheduledReleaseIndicator } from "./collect-scheduled-release.js";

export async function collectAllIndicators({
  indicators,
  providerDefaults,
  asOf,
  apiKey,
  fetchImpl = fetch
}) {
  const marketOutputs = await collectMarketPriceIndicators({
    indicators,
    providerDefaults,
    asOf,
    apiKey,
    fetchImpl
  });

  const scheduledEntries = Object.entries(indicators).filter(
    ([, indicator]) => indicator.type === "scheduled_release"
  );

  const scheduledOutputs = await Promise.all(
    scheduledEntries.map(([indicatorId, indicator]) =>
      collectScheduledReleaseIndicator({
        indicatorId,
        indicator,
        providerDefaults,
        asOf,
        apiKey,
        fetchImpl
      })
    )
  );

  return [...marketOutputs, ...scheduledOutputs];
}
