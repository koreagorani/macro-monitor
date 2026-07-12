import test from "node:test";
import assert from "node:assert/strict";

import { loadJsonFile } from "../src/config/load-config.js";
import { renderWeeklyReportMarkdown } from "../src/render/render-weekly-report-markdown.js";

test("weekly report Markdown renderer includes required MVP sections", async () => {
  const weeklyReportOutput = await loadJsonFile("data/examples/weekly-report-output.example.json");
  const markdown = renderWeeklyReportMarkdown(weeklyReportOutput);

  for (const heading of [
    "# 주간 매크로 리뷰",
    "## 전체 위험 요약",
    "## 핵심 변화",
    "## 영역별 위험 요약",
    "## 취약 테마 상위 3개",
    "## 헷지 필요성 및 대응 제안",
    "## 다음 주 확인 조건",
    "## 주의"
  ]) {
    assert.ok(markdown.includes(heading), `${heading} missing from Markdown`);
  }

  assert.ok(markdown.includes("2026-07-05"));
  assert.ok(markdown.includes("높은 위험"));
  assert.ok(markdown.includes("알트코인"));
  assert.ok(markdown.includes("기대수익률이나 직접적인 매도 신호가 아닙니다"));
});

test("weekly report Markdown renderer does not expose personal holding fields", async () => {
  const weeklyReportOutput = await loadJsonFile("data/examples/weekly-report-output.example.json");
  const markdown = renderWeeklyReportMarkdown(weeklyReportOutput);

  for (const forbidden of [
    "holdingQuantity",
    "marketValue",
    "accountValue",
    "보유 수량",
    "평가금액",
    "계좌별 비중"
  ]) {
    assert.equal(markdown.includes(forbidden), false, `${forbidden} must not be rendered`);
  }
});

test("weekly report Markdown renderer is a deterministic synchronous function", async () => {
  const weeklyReportOutput = await loadJsonFile("data/examples/weekly-report-output.example.json");

  const first = renderWeeklyReportMarkdown(weeklyReportOutput);
  const second = renderWeeklyReportMarkdown(weeklyReportOutput);

  assert.equal(typeof first, "string");
  assert.equal(first, second);
  assert.equal(first.endsWith("\n"), true);
});

test("weekly report Markdown renderer handles empty arrays and omitted nested fields", () => {
  const markdown = renderWeeklyReportMarkdown({
    asOf: "2026-07-12",
    generatedAt: "2026-07-12T00:00:00.000Z",
    sourceMacroReview: {},
    report: {
      title: "빈 배열 안전성 확인",
      oneLookConclusion: {
        coreChanges: []
      },
      areaRisks: [],
      portfolioThemes: [],
      hedgeAndDefense: {
        candidates: []
      },
      nextWeekChecklist: {}
    },
    warnings: []
  });

  assert.ok(markdown.includes("# 빈 배열 안전성 확인"));
  assert.ok(markdown.includes("- 해당 없음"));
  assert.ok(markdown.includes("## 영역별 위험 요약"));
  assert.ok(markdown.includes("## 취약 테마 상위 3개"));
  assert.ok(markdown.includes("취약도는 현재 매크로 환경에 대한 노출 정도"));
});

test("weekly report Markdown renderer escapes table separators", () => {
  const markdown = renderWeeklyReportMarkdown({
    report: {
      areaRisks: [
        {
          name: "금리|정책",
          score: 0,
          status: "normal",
          keyReason: "A|B"
        }
      ]
    }
  });

  assert.ok(markdown.includes("금리\\|정책"));
  assert.ok(markdown.includes("A\\|B"));
  assert.ok(markdown.includes("| 0 |"));
});
