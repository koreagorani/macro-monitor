import test from "node:test";
import assert from "node:assert/strict";

import { loadJsonFile } from "../src/config/load-config.js";
import {
  escapeEnhancedMarkdownText,
  renderWeeklyReportMarkdown
} from "../src/render/render-weekly-report-markdown.js";

async function exampleReport() {
  return loadJsonFile("data/examples/weekly-report-output.example.json");
}

test("weekly report Markdown renderer uses the six data-first sections in order", async () => {
  const markdown = renderWeeklyReportMarkdown(await exampleReport());
  const headings = [
    "## 1. 한눈에 보는 전체 상태",
    "## 2. 핵심 지표 데이터 현황",
    "## 3. 영역별 위험과 AI 해석",
    "## 4. 포트폴리오 취약 테마",
    "## 5. 대응 및 다음 주 확인 조건",
    "## 6. 경고 및 주의 문구"
  ];

  let previousIndex = -1;
  for (const heading of headings) {
    const index = markdown.indexOf(heading);
    assert.ok(index > previousIndex, `${heading} must appear in report order`);
    previousIndex = index;
  }

  assert.match(markdown, /전체 위험: high_risk \(높은 위험\)/);
  assert.match(markdown, /전체 위험 점수: 0\.55/);
  assert.match(markdown, /권장 대응: 신규매수 신중/);
});

test("weekly report Markdown renders all market facts in reportPriority order", async () => {
  const report = await exampleReport();
  const before = structuredClone(report.facts);
  const markdown = renderWeeklyReportMarkdown(report);
  const orderedNames = ["미국 2년물 국채금리", "WTI", "원·달러 환율", "S&P 500", "비트코인"];

  let previousIndex = -1;
  for (const name of orderedNames) {
    const index = markdown.indexOf(`<td>${escapeEnhancedMarkdownText(name)}</td>`);
    assert.ok(index > previousIndex, `${name} must follow reportPriority order`);
    previousIndex = index;
  }

  for (const expected of [
    "4.32%", "+12.4bp", "-8.6bp", "2026-07-03", "2026-06-27", "2026-06-06",
    "75.3 USD/barrel", "+3.6%", "+6.2%",
    "1,375.4 KRW/USD", "+0.4%", "+1.1%",
    "6,201.4 index", "-0.8%", "+2.2%",
    "105,432 USD", "-6.4%", "-4.2%"
  ]) {
    assert.ok(markdown.includes(expected), `${expected} missing from market fact table`);
  }
  assert.deepEqual(report.facts, before, "display formatting must not mutate raw facts");
});

test("weekly report Markdown renders Core PCE observation facts without calling the date a release date", async () => {
  const markdown = renderWeeklyReportMarkdown(await exampleReport());
  for (const expected of [
    "### Core PCE",
    "근원 PCE",
    "최신 전월비",
    "이전 전월비",
    "최근 3개월 평균 전월비",
    "consensus",
    "0.22% MoM",
    "0.19% MoM",
    "0.24% MoM",
    "2026-05-01",
    "2026-05",
    "전월비 기준 정상"
  ]) {
    assert.ok(markdown.includes(expected), `${expected} missing from Core PCE table`);
  }
  assert.match(markdown, /<td>consensus<\/td>[\s\S]*?<td>—<\/td>/);
  assert.equal(markdown.includes("발표일"), false);
});

test("area and theme rows join canonical facts with analysis by ID", async () => {
  const report = await exampleReport();
  report.analysis.areaInsights.find(({ areaId }) => areaId === "rates_policy").keyReason = "AREA_JOIN_TOKEN";
  report.analysis.themeInsights.find(({ themeId }) => themeId === "crypto_altcoins").keyReasons = ["THEME_JOIN_TOKEN"];
  report.analysis.themeInsights.find(({ themeId }) => themeId === "crypto_altcoins").action = "축소 검토";
  const markdown = renderWeeklyReportMarkdown(report);

  assert.match(markdown, /<td>금리·통화정책<\/td>[\s\S]*?<td>0\.63<\/td>[\s\S]*?<td>watch<\/td>[\s\S]*?<td>AREA_JOIN_TOKEN<\/td>/);
  assert.match(markdown, /### 1\. 알트코인[\s\S]*?취약도 점수: 1\.98[\s\S]*?단계: alert[\s\S]*?대응: 축소 검토[\s\S]*?THEME_JOIN_TOKEN/);
  assert.equal(markdown.includes("0.625"), false);
  assert.equal(markdown.includes("1.9803571428571427"), false);
});

test("deterministic facts appear before general AI analysis", async () => {
  const report = await exampleReport();
  report.analysis.macroJudgment.summary = "AI_SECTION_TOKEN";
  const markdown = renderWeeklyReportMarkdown(report);
  assert.ok(markdown.indexOf("## 2. 핵심 지표 데이터 현황") < markdown.indexOf("AI_SECTION_TOKEN"));
});

test("renderer uses Notion enhanced Markdown tables without GFM separator or placeholder rows", async () => {
  const markdown = renderWeeklyReportMarkdown(await exampleReport());
  assert.match(markdown, /<table fit-page-width="true" header-row="true">/);
  assert.match(markdown, /<tr>[\s\S]*?<td>지표<\/td>/);
  assert.equal(/^\s*\|(?:\s*:?-{3,}:?\s*\|){2,}\s*$/m.test(markdown), false);
  assert.equal(/^\s*---\s*$/m.test(markdown), false);
  assert.doesNotMatch(markdown, /<tr>\s*(?:<td>:?-{3,}:?<\/td>\s*)+<\/tr>/);
});

test("enhanced Markdown table cells escape reserved rich-text characters", () => {
  assert.equal(escapeEnhancedMarkdownText("금리|정책 <A>"), "금리\\|정책 \\<A\\>");
});

test("weekly report Markdown renderer does not expose personal holding fields", async () => {
  const markdown = renderWeeklyReportMarkdown(await exampleReport());
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

test("weekly report Markdown renderer is deterministic and synchronous", async () => {
  const report = await exampleReport();
  const first = renderWeeklyReportMarkdown(report);
  const second = renderWeeklyReportMarkdown(report);
  assert.equal(typeof first, "string");
  assert.equal(first, second);
  assert.equal(first.endsWith("\n"), true);
});
