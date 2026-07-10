import test from "node:test";
import assert from "node:assert/strict";

import { loadJsonFile } from "../src/config/load-config.js";
import { validateWeeklyReportOutput } from "../src/validation/validate-weekly-report-output.js";

const forbiddenPhrases = [
  "무조건 매도",
  "전량 정리",
  "반드시 상승",
  "반드시 하락",
  "확실한 매수"
];

function collectStrings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

test("weekly report example validates against schema", async () => {
  const output = await loadJsonFile("data/examples/weekly-report-output.example.json");
  const validation = await validateWeeklyReportOutput(output);

  assert.equal(validation.valid, true);
});

test("weekly report example keeps portfolio vulnerability disclosure", async () => {
  const output = await loadJsonFile("data/examples/weekly-report-output.example.json");

  assert.match(
    output.report.mandatoryDisclosure,
    /취약도는 현재 매크로 환경에 대한 노출 정도/
  );
  assert.match(
    output.report.mandatoryDisclosure,
    /직접적인 매도 신호가 아닙니다/
  );
});

test("weekly report example uses only allowed action phrases", async () => {
  const output = await loadJsonFile("data/examples/weekly-report-output.example.json");
  const allowedActions = new Set([
    "유지",
    "신규매수 신중",
    "신규매수 보류",
    "비중 확대 중단",
    "투자 가설 재확인",
    "축소 검토",
    "헤지 검토"
  ]);

  assert.ok(allowedActions.has(output.report.oneLookConclusion.recommendedAction));
  for (const theme of output.report.portfolioThemes) {
    assert.ok(allowedActions.has(theme.action));
  }
});

test("weekly report example does not contain forbidden investment language", async () => {
  const output = await loadJsonFile("data/examples/weekly-report-output.example.json");
  const allText = collectStrings(output).join("\n");

  for (const phrase of forbiddenPhrases) {
    assert.equal(allText.includes(phrase), false, `${phrase} should not appear`);
  }
});

test("weekly report example does not expose personal holding fields", async () => {
  const output = await loadJsonFile("data/examples/weekly-report-output.example.json");
  const serialized = JSON.stringify(output);

  for (const forbiddenKey of ["quantity", "shares", "accountValue", "marketValue", "평가금액", "보유수량"]) {
    assert.equal(serialized.includes(forbiddenKey), false, `${forbiddenKey} should not appear`);
  }
});
