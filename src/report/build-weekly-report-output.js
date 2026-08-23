const MANDATORY_DISCLOSURE =
  "취약도는 현재 매크로 환경에 대한 노출 정도이며, 기대수익률이나 직접적인 매도 신호가 아닙니다.";

export function buildWeeklyReportOutput({
  macroReviewOutput,
  analysis,
  generatedAt = new Date().toISOString()
}) {
  if (!macroReviewOutput.reportFacts) {
    throw new Error("Weekly report output requires deterministic report facts.");
  }

  const warnings = [
    ...(macroReviewOutput.reportFacts.warnings ?? []),
    ...(macroReviewOutput.warnings ?? [])
  ].filter((warning, index, values) =>
    values.findIndex(({ code, message }) => code === warning.code && message === warning.message) === index
  );

  return {
    schemaVersion: "2.0.0",
    asOf: macroReviewOutput.asOf,
    generatedAt,
    presentation: {
      title: `주간 매크로 리뷰 — ${macroReviewOutput.asOf}`,
      mandatoryDisclosure: MANDATORY_DISCLOSURE
    },
    facts: structuredClone(macroReviewOutput.reportFacts),
    analysis: structuredClone(analysis),
    warnings: structuredClone(warnings)
  };
}

export { MANDATORY_DISCLOSURE };
