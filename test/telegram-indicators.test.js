import assert from "node:assert/strict";
import test from "node:test";
import { STATUS_PRIORITY, selectTelegramIndicators } from "../src/telegram/select-telegram-indicators.js";
import { loadJsonFile } from "../src/config/load-config.js";

const row = (indicatorId, status, riskContribution = 0, reportPriority = 1) =>
  ({ indicatorId, status, riskContribution, reportPriority });
const ids = (rows) => selectTelegramIndicators(rows).map(({ indicatorId }) => indicatorId);

test("Telegram status priority exactly covers the facts enum", async () => {
  const schema = await loadJsonFile("data/schema/report-facts.schema.json");
  assert.deepEqual(Object.keys(STATUS_PRIORITY).sort(), [...schema.$defs.status.enum].sort());
  const statuses = ["strong_alert", "alert", "watch", "normal", "easing", "unavailable"];
  for (let i = 0; i < statuses.length - 1; i += 1) {
    assert.deepEqual(ids([row("lower", statuses[i + 1], 100), row("higher", statuses[i], -100)]),
      ["higher", "lower"]);
  }
});

test("Telegram selection uses raw contribution before priority and lexical ID", () => {
  assert.deepEqual(ids([
    row("a", "watch", 0.101, 1),
    row("z", "watch", 0.104, 9),
    row("b", "watch", 0.101, 1),
    row("c", "watch", 0.101, 2)
  ]), ["z", "a", "b"]);
});

test("Telegram null contributions sort last without replacing negative values with zero", () => {
  assert.deepEqual(ids([
    row("null_a", "unavailable", null, 1),
    row("negative", "unavailable", -1, 9),
    row("null_b", "unavailable", null, 2)
  ]), ["negative", "null_a", "null_b"]);
});

test("Telegram selection is permutation-independent and preserves frozen input", () => {
  const rows = Object.freeze([
    Object.freeze(row("b", "normal")), Object.freeze(row("a", "normal")),
    Object.freeze(row("c", "watch")), Object.freeze(row("d", "easing"))
  ]);
  assert.deepEqual(ids(rows), ["c", "a", "b"]);
  assert.deepEqual(ids([...rows].reverse()), ["c", "a", "b"]);
  assert.deepEqual(rows.map(({ indicatorId }) => indicatorId), ["b", "a", "c", "d"]);
  assert.deepEqual(ids([]), []);
});
