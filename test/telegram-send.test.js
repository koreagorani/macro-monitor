import assert from "node:assert/strict";
import test from "node:test";

import { sendWeeklyReportNotification } from "../src/telegram/send-weekly-report-notification.js";
import { loadJsonFile } from "../src/config/load-config.js";
import { REQUIRED_DATA_SOURCE_PROPERTIES } from "../src/notion/save-weekly-report-to-notion.js";

function macroReview({ shouldAbort = false } = {}) {
  return {
    asOf: "2026-07-18",
    riskOutput: {
      asOf: "2026-07-18",
      quality: {
        shouldAbort,
        confidence: shouldAbort ? "aborted" : "normal",
        failedCoreIndicators: shouldAbort ? [{ indicatorId: "us2y" }, { indicatorId: "core_pce" }] : [],
        warnings: shouldAbort ? [{ code: "CORE_INDICATOR_UNAVAILABLE" }] : []
      }
    }
  };
}

function weeklyReport() {
  return {
    asOf: "2026-07-18",
    sourceMacroReview: {
      overallLevel: "normal",
      overallScore: 0.2,
      confidence: "normal"
    },
    report: {
      oneLookConclusion: {
        coreChanges: ["변화"],
        recommendedAction: "유지"
      },
      portfolioThemes: []
    }
  };
}

function normalDependencies(events, overrides = {}) {
  return {
    macroReviewOutput: macroReview(),
    openaiClient: { name: "openai" },
    notionClient: { name: "notion" },
    telegramClient: {
      sendMessage: async ({ text }) => {
        events.push(["telegram", text]);
        return { delivered: true };
      }
    },
    generateWeeklyReportFn: async () => {
      events.push(["openai"]);
      return weeklyReport();
    },
    validateWeeklyReportFn: async () => ({ valid: true, errors: [] }),
    renderMarkdownFn: () => {
      events.push(["markdown"]);
      return "# private markdown";
    },
    saveToNotionFn: async ({ markdown }) => {
      events.push(["notion", markdown]);
      return { status: "updated", asOf: "2026-07-18", verified: true };
    },
    ...overrides
  };
}

test("normal flow sends Telegram only after verified Notion save", async () => {
  const events = [];
  const result = await sendWeeklyReportNotification(normalDependencies(events));

  assert.deepEqual(events.map(([name]) => name), ["openai", "markdown", "notion", "telegram"]);
  assert.deepEqual(result, {
    status: "sent",
    notificationType: "weekly",
    asOf: "2026-07-18",
    notionStatus: "updated",
    verified: true
  });
});

test("unverified Notion save prevents Telegram transmission", async () => {
  const events = [];
  await assert.rejects(
    sendWeeklyReportNotification(normalDependencies(events, {
      saveToNotionFn: async () => {
        events.push(["notion"]);
        return { status: "updated", verified: false };
      }
    })),
    (error) => error.code === "TELEGRAM_NOTION_SAVE_NOT_VERIFIED"
  );
  assert.deepEqual(events.map(([name]) => name), ["openai", "markdown", "notion"]);
});

test("Telegram failure happens after Notion and does not trigger rollback", async () => {
  const events = [];
  await assert.rejects(
    sendWeeklyReportNotification(normalDependencies(events, {
      telegramClient: {
        sendMessage: async () => {
          events.push(["telegram"]);
          throw Object.assign(new Error("safe failure"), { code: "TELEGRAM_FORBIDDEN" });
        }
      }
    })),
    (error) => error.code === "TELEGRAM_FORBIDDEN"
  );
  assert.deepEqual(events.map(([name]) => name), ["openai", "markdown", "notion", "telegram"]);
  assert.equal(events.some(([name]) => name === "rollback"), false);
});

test("shouldAbort skips OpenAI, Markdown, and Notion and sends quality failure only", async () => {
  const events = [];
  const result = await sendWeeklyReportNotification({
    macroReviewOutput: macroReview({ shouldAbort: true }),
    telegramClient: {
      sendMessage: async ({ text }) => {
        events.push(["telegram", text]);
        return { delivered: true };
      }
    },
    generateWeeklyReportFn: async () => assert.fail("OpenAI must be skipped"),
    renderMarkdownFn: () => assert.fail("Markdown must be skipped"),
    saveToNotionFn: async () => assert.fail("Notion must be skipped")
  });

  assert.deepEqual(events.map(([name]) => name), ["telegram"]);
  assert.match(events[0][1], /데이터 품질 실패/);
  assert.deepEqual(result, {
    status: "sent",
    notificationType: "quality_failure",
    asOf: "2026-07-18",
    notionStatus: "skipped",
    verified: null
  });
});

test("safe orchestration result excludes message and external identifiers", async () => {
  const events = [];
  const result = await sendWeeklyReportNotification(normalDependencies(events));
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /private markdown|주간 매크로|bot|chat|page|deliveryKey/);
});

for (const missingIndicator of [false, true]) {
  test(`v2 real renderer and Notion verification ${missingIndicator ? "block" : "allow"} data-first Telegram delivery`, async () => {
    const report = await loadJsonFile("data/examples/weekly-report-output.example.json");
    const events = [];
    let saved;
    const deps = {
      macroReviewOutput: { riskOutput: { asOf: report.asOf, quality: { shouldAbort: false } } },
      openaiClient: {},
      generateWeeklyReportFn: async () => report,
      notionClient: {
        retrieveDataSource: async () => ({ properties: Object.fromEntries(
          Object.entries(REQUIRED_DATA_SOURCE_PROPERTIES).map(([name, type]) => [name, { type }])
        ) }),
        queryPagesByReportKey: async () => [],
        createReportPage: async (payload) => { saved = payload; events.push("save"); return { id: "private-page" }; },
        retrievePage: async () => ({ properties: saved.properties }),
        retrievePageMarkdown: async () => {
          events.push("read-back");
          return { truncated: false, markdown: missingIndicator
            ? saved.markdown.replaceAll("WTI", "MISSING") : saved.markdown };
        }
      },
      telegramClient: {
        sendMessage: async ({ text }) => {
          events.push("telegram");
          assert.match(text, /중요 실제 지표/);
          assert.match(text, /75\.3 USD\/barrel/);
          assert.match(text, /🟡 주의 \(watch\)/);
          return { delivered: true };
        }
      }
    };
    if (missingIndicator) {
      await assert.rejects(sendWeeklyReportNotification(deps),
        (error) => error.code === "NOTION_READ_BACK_VERIFICATION_FAILED");
      assert.equal(events.includes("telegram"), false);
    } else {
      const result = await sendWeeklyReportNotification(deps);
      assert.deepEqual(events, ["save", "read-back", "telegram"]);
      assert.equal(result.verified, true);
      assert.doesNotMatch(JSON.stringify(result), /75\.3|private-page|중요 실제 지표/);
    }
  });
}
