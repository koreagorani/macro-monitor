const DEFAULT_TIMEOUT_MS = 15000;

export class FredApiError extends Error {
  constructor(message, { code = "FRED_API_ERROR", status = null } = {}) {
    super(message);
    this.name = "FredApiError";
    this.code = code;
    this.status = status;
  }
}

export async function fetchFredObservations({
  apiBaseUrl,
  apiKey,
  seriesId,
  observationStart,
  observationEnd,
  fileType = "json",
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS
}) {
  if (!apiKey) {
    throw new FredApiError("FRED API key is missing", { code: "MISSING_API_KEY" });
  }

  const url = new URL(apiBaseUrl);
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", fileType);
  url.searchParams.set("observation_start", observationStart);
  url.searchParams.set("observation_end", observationEnd);
  url.searchParams.set("sort_order", "asc");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) {
      throw new FredApiError(`FRED request failed with HTTP ${response.status}`, {
        code: "HTTP_ERROR",
        status: response.status
      });
    }

    const body = await response.json();
    if (!Array.isArray(body.observations)) {
      throw new FredApiError("FRED response does not contain observations", {
        code: "INVALID_RESPONSE"
      });
    }

    return body.observations;
  } catch (error) {
    if (error instanceof FredApiError) throw error;
    if (error?.name === "AbortError") {
      throw new FredApiError("FRED request timed out", { code: "TIMEOUT" });
    }
    throw new FredApiError("FRED request failed", { code: "NETWORK_ERROR" });
  } finally {
    clearTimeout(timeout);
  }
}
