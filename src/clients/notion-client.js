const DEFAULT_NOTION_API_VERSION = "2026-03-11";
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504, 529]);

class NotionClientError extends Error {
  constructor(code, message, { status = null, cause = null } = {}) {
    super(message);
    this.name = "NotionClientError";
    this.code = code;
    this.status = status;
    this.cause = cause;
  }
}

function requiredString(value, code, message) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new NotionClientError(code, message);
  }
  return value.trim();
}

function statusError(status) {
  const codes = {
    400: "NOTION_BAD_REQUEST",
    401: "NOTION_UNAUTHORIZED",
    403: "NOTION_FORBIDDEN",
    404: "NOTION_NOT_FOUND",
    409: "NOTION_CONFLICT",
    429: "NOTION_RATE_LIMITED"
  };
  const code = codes[status] ?? (status >= 500 ? "NOTION_SERVICE_ERROR" : "NOTION_API_REQUEST_FAILED");
  return new NotionClientError(code, `Notion API request failed with status ${status}.`, { status });
}

function retryDelayMs(response, attempt) {
  const retryAfter = Number(response.headers?.get?.("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter >= 0) {
    return Math.min(retryAfter * 1000, 10_000);
  }
  return Math.min(250 * (2 ** attempt), 2_000);
}

class NotionClient {
  constructor({
    apiKey,
    dataSourceId,
    notionVersion = DEFAULT_NOTION_API_VERSION,
    baseUrl = "https://api.notion.com/v1",
    fetchImpl = globalThis.fetch,
    maxRetries = 2,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  }) {
    this.apiKey = requiredString(apiKey, "NOTION_API_KEY_MISSING", "NOTION_API_KEY is required.");
    this.dataSourceId = requiredString(dataSourceId, "NOTION_DATA_SOURCE_ID_MISSING", "NOTION_DATA_SOURCE_ID is required.");
    this.notionVersion = requiredString(notionVersion, "NOTION_API_VERSION_MISSING", "NOTION_API_VERSION is required.");
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.fetchImpl = fetchImpl;
    this.maxRetries = maxRetries;
    this.sleep = sleep;
  }

  async request(path, { method = "GET", body = null } = {}) {
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      let response;
      try {
        response = await this.fetchImpl(`${this.baseUrl}${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "Notion-Version": this.notionVersion
          },
          ...(body === null ? {} : { body: JSON.stringify(body) })
        });
      } catch (error) {
        throw new NotionClientError(
          "NOTION_NETWORK_ERROR",
          "Notion API request failed before receiving a response.",
          { cause: error }
        );
      }

      if (!response.ok) {
        if (RETRYABLE_STATUSES.has(response.status) && attempt < this.maxRetries) {
          await this.sleep(retryDelayMs(response, attempt));
          continue;
        }
        throw statusError(response.status);
      }

      try {
        return await response.json();
      } catch (error) {
        throw new NotionClientError(
          "NOTION_INVALID_JSON_RESPONSE",
          "Notion API response could not be parsed as JSON.",
          { status: response.status, cause: error }
        );
      }
    }

    throw new NotionClientError("NOTION_API_REQUEST_FAILED", "Notion API request failed.");
  }

  async queryPagesByReportKey(reportKey) {
    const response = await this.request(`/data_sources/${encodeURIComponent(this.dataSourceId)}/query`, {
      method: "POST",
      body: {
        filter: {
          property: "Report Key",
          rich_text: { equals: reportKey }
        },
        page_size: 2
      }
    });

    if (!Array.isArray(response?.results)) {
      throw new NotionClientError("NOTION_QUERY_RESPONSE_INVALID", "Notion query response did not include results.");
    }
    return response.results.map((page) => ({ id: page.id, properties: page.properties ?? {} }));
  }

  async createReportPage({ properties, markdown }) {
    const response = await this.request("/pages", {
      method: "POST",
      body: {
        parent: { data_source_id: this.dataSourceId },
        properties,
        markdown
      }
    });
    if (typeof response?.id !== "string") {
      throw new NotionClientError("NOTION_CREATE_RESPONSE_INVALID", "Notion create response did not include a page id.");
    }
    return { id: response.id };
  }

  async updatePageProperties({ pageId, properties }) {
    await this.request(`/pages/${encodeURIComponent(pageId)}`, {
      method: "PATCH",
      body: { properties }
    });
  }

  async replacePageMarkdown({ pageId, markdown }) {
    await this.request(`/pages/${encodeURIComponent(pageId)}/markdown`, {
      method: "PATCH",
      body: {
        type: "replace_content",
        replace_content: { new_str: markdown }
      }
    });
  }

  retrievePage(pageId) {
    return this.request(`/pages/${encodeURIComponent(pageId)}`);
  }

  retrievePageMarkdown(pageId) {
    return this.request(`/pages/${encodeURIComponent(pageId)}/markdown`);
  }
}

function createNotionClientFromEnv({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  return new NotionClient({
    apiKey: env.NOTION_API_KEY,
    dataSourceId: env.NOTION_DATA_SOURCE_ID,
    notionVersion: env.NOTION_API_VERSION?.trim() || DEFAULT_NOTION_API_VERSION,
    fetchImpl
  });
}

export {
  DEFAULT_NOTION_API_VERSION,
  NotionClient,
  NotionClientError,
  createNotionClientFromEnv
};
