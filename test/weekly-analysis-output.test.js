import test from "node:test";
import assert from "node:assert/strict";

import { validateWeeklyAnalysisConsistency } from "../src/report/validate-report-consistency.js";
import { validateWeeklyAnalysisOutput } from "../src/validation/validate-weekly-analysis-output.js";
import { buildReportV2Fixture } from "../test-support/report-v2-fixture.js";

test("analysis schema permits interpretation but rejects canonical fact fields", async () => {
  const { analysis } = await buildReportV2Fixture();
  assert.equal((await validateWeeklyAnalysisOutput(analysis)).valid, true);

  const changed = structuredClone(analysis);
  changed.areaInsights[0].score = 1;
  assert.equal((await validateWeeklyAnalysisOutput(changed)).valid, false);
});

test("analysis consistency requires exact unique area and theme ID sets", async () => {
  const { analysis, reportFacts } = await buildReportV2Fixture();
  const changed = structuredClone(analysis);
  changed.areaInsights[1].areaId = changed.areaInsights[0].areaId;
  changed.themeInsights.pop();

  const validation = validateWeeklyAnalysisConsistency({ analysis: changed, reportFacts });

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some(({ keyword }) => keyword === "duplicateId"));
  assert.ok(validation.errors.some(({ keyword }) => keyword === "exactSet"));
});

test("analysis consistency rejects hedge candidate IDs absent from facts", async () => {
  const { analysis, reportFacts } = await buildReportV2Fixture();
  const changed = structuredClone(analysis);
  changed.hedgeAndDefense.candidates[0].candidateId = "invented_candidate";

  const validation = validateWeeklyAnalysisConsistency({ analysis: changed, reportFacts });

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some(({ keyword }) => keyword === "sourceId"));
});
