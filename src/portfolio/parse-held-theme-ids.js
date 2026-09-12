const THEME_ID_PATTERN = /^[a-z][a-z0-9_]*$/;

export class PortfolioProfileError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PortfolioProfileError";
    this.code = code;
    this.errors = [];
  }
}

export function parseHeldThemeIds({ rawValue, portfolioThemesConfig }) {
  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    throw new PortfolioProfileError(
      "PORTFOLIO_PROFILE_REQUIRED",
      "Private held-theme profile is required for portfolio vulnerability evaluation."
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    throw new PortfolioProfileError(
      "PORTFOLIO_PROFILE_INVALID",
      "Private held-theme profile must be a valid JSON array."
    );
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new PortfolioProfileError(
      "PORTFOLIO_PROFILE_INVALID",
      "Private held-theme profile must contain at least one theme ID."
    );
  }

  if (parsed.some((themeId) => typeof themeId !== "string" || !THEME_ID_PATTERN.test(themeId))) {
    throw new PortfolioProfileError(
      "PORTFOLIO_PROFILE_INVALID",
      "Private held-theme profile contains an invalid theme ID."
    );
  }

  const uniqueThemeIds = new Set(parsed);
  if (uniqueThemeIds.size !== parsed.length) {
    throw new PortfolioProfileError(
      "PORTFOLIO_PROFILE_INVALID",
      "Private held-theme profile contains duplicate theme IDs."
    );
  }

  const enabledThemeIds = new Set(
    (portfolioThemesConfig.themes ?? [])
      .filter((theme) => theme.enabled !== false)
      .map((theme) => theme.themeId)
  );
  if (parsed.some((themeId) => !enabledThemeIds.has(themeId))) {
    throw new PortfolioProfileError(
      "PORTFOLIO_PROFILE_INVALID",
      "Private held-theme profile contains an unknown or disabled theme ID."
    );
  }

  return parsed;
}
