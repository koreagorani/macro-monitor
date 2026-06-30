import { collectMarketPriceIndicator } from "./collect-market-price.js";

export async function collectMarketPriceIndicators({
  indicators,
  providerDefaults,
  asOf,
  apiKey,
  fetchImpl = fetch
}) {
  const entries = Object.entries(indicators).filter(
    ([, indicator]) => indicator.type === "market_price"
  );

  return Promise.all(
    entries.map(([indicatorId, indicator]) =>
      collectMarketPriceIndicator({
        indicatorId,
        indicator,
        providerDefaults,
        asOf,
        apiKey,
        fetchImpl
      })
    )
  );
}
