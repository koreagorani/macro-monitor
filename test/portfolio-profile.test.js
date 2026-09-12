import assert from "node:assert/strict";
import test from "node:test";

import { loadJsonFile } from "../src/config/load-config.js";
import {
  parseHeldThemeIds,
  PortfolioProfileError
} from "../src/portfolio/parse-held-theme-ids.js";

const portfolioThemesConfig = await loadJsonFile("config/portfolio-themes.json");

test("private portfolio profile accepts unique enabled theme IDs", () => {
  const rawValue = JSON.stringify(["crypto_altcoins", "cash_and_short_duration"]);

  assert.deepEqual(parseHeldThemeIds({ rawValue, portfolioThemesConfig }), [
    "crypto_altcoins",
    "cash_and_short_duration"
  ]);
});

for (const [name, rawValue] of [
  ["missing", undefined],
  ["blank", "   "],
  ["invalid JSON", "not-json"],
  ["not an array", "{}"],
  ["empty", "[]"],
  ["duplicate", '["crypto_altcoins","crypto_altcoins"]'],
  ["placeholder", '["---"]'],
  ["unknown", '["not_configured"]']
]) {
  test(`private portfolio profile rejects ${name} input without echoing it`, () => {
    assert.throws(
      () => parseHeldThemeIds({ rawValue, portfolioThemesConfig }),
      (error) => {
        assert.ok(error instanceof PortfolioProfileError);
        assert.match(error.code, /^PORTFOLIO_PROFILE_/);
        assert.doesNotMatch(error.message, /not-json|crypto_altcoins|not_configured|---/);
        return true;
      }
    );
  });
}
