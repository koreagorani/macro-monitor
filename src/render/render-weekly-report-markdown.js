function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function display(value, fallback = "—") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function escapeTableCell(value) {
  return display(value)
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
}

function renderBulletList(items, { limit = null, emptyText = "해당 없음" } = {}) {
  const values = asArray(items);
  const selected = limit === null ? values : values.slice(0, limit);

  if (selected.length === 0) {
    return `- ${emptyText}`;
  }

  return selected.map((item) => `- ${display(item)}`).join("\n");
}

function renderWeeklyReportMarkdown(weeklyReportOutput = {}) {
  const report = weeklyReportOutput.report ?? {};
  const conclusion = report.oneLookConclusion ?? {};
  const source = weeklyReportOutput.sourceMacroReview ?? {};
  const areaRisks = asArray(report.areaRisks);
  const portfolioThemes = asArray(report.portfolioThemes).slice(0, 3);
  const hedge = report.hedgeAndDefense ?? {};
  const checklist = report.nextWeekChecklist ?? {};
  const warnings = asArray(weeklyReportOutput.warnings);
  const lines = [];

  lines.push(`# ${display(report.title, "주간 매크로 보고서")}`);
  lines.push("");
  lines.push(`- 기준일: ${display(weeklyReportOutput.asOf ?? conclusion.basisDate ?? source.asOf)}`);
  lines.push(`- 생성시각: ${display(weeklyReportOutput.generatedAt)}`);
  lines.push("");

  lines.push("## 전체 위험 요약");
  lines.push("");
  lines.push(`- 전체 위험: ${display(conclusion.overallRisk ?? source.overallLevel)}`);
  lines.push(`- 전체 위험 점수: ${display(source.overallScore)}`);
  lines.push(`- 신뢰도: ${display(source.confidence)}`);
  lines.push(`- 권장 대응: ${display(conclusion.recommendedAction)}`);
  lines.push("");

  lines.push("## 핵심 변화");
  lines.push("");
  lines.push(renderBulletList(conclusion.coreChanges, { limit: 3 }));
  lines.push("");

  lines.push("## 영역별 위험 요약");
  lines.push("");
  if (areaRisks.length === 0) {
    lines.push("- 해당 없음");
  } else {
    lines.push("| 영역 | 점수 | 등급 | 핵심 이유 |");
    lines.push("|---|---:|---|---|");
    for (const area of areaRisks) {
      lines.push(
        `| ${escapeTableCell(area?.name ?? area?.areaId)} | ${escapeTableCell(area?.score)} | ${escapeTableCell(area?.status)} | ${escapeTableCell(area?.keyReason)} |`
      );
    }
  }
  lines.push("");

  lines.push("## 취약 테마 상위 3개");
  lines.push("");
  if (portfolioThemes.length === 0) {
    lines.push("- 해당 없음");
  } else {
    portfolioThemes.forEach((theme, index) => {
      lines.push(`### ${index + 1}. ${display(theme?.name ?? theme?.themeId)}`);
      lines.push("");
      lines.push(`- 취약도: ${display(theme?.score)}`);
      lines.push(`- 등급: ${display(theme?.level)}`);
      lines.push(`- 대응: ${display(theme?.action)}`);
      lines.push("- 핵심 이유:");
      lines.push(renderBulletList(theme?.keyReasons, { limit: 2 }));
      lines.push("");
    });
  }

  lines.push("## 헷지 필요성 및 대응 제안");
  lines.push("");
  lines.push(`- 필요성: ${display(hedge.needLevel)}`);
  lines.push(`- 요약: ${display(hedge.summary)}`);
  const candidates = asArray(hedge.candidates).slice(0, 2);
  if (candidates.length > 0) {
    lines.push("- 후보:");
    candidates.forEach((candidate) => {
      lines.push(`  - ${display(candidate?.name ?? candidate?.candidateId)}: ${display(candidate?.whyItFits)}`);
      lines.push(`    - 실패 조건: ${display(candidate?.failureCondition)}`);
      lines.push(`    - 현금 비교: ${display(candidate?.cashComparison)}`);
    });
  }
  lines.push("");

  lines.push("## 다음 주 확인 조건");
  lines.push("");
  lines.push("### 예정 지표");
  lines.push("");
  lines.push(renderBulletList(checklist.scheduledIndicators));
  lines.push("");
  lines.push("### 위험 강화 조건");
  lines.push("");
  lines.push(renderBulletList(checklist.riskStrengtheningConditions));
  lines.push("");
  lines.push("### 위험 완화 조건");
  lines.push("");
  lines.push(renderBulletList(checklist.riskEasingConditions));
  lines.push("");
  lines.push("### 기본 시나리오 무효화 조건");
  lines.push("");
  lines.push(renderBulletList(checklist.invalidatingConditions));
  lines.push("");

  if (warnings.length > 0) {
    lines.push("## 경고");
    lines.push("");
    lines.push(renderBulletList(warnings.map((warning) => {
      if (typeof warning === "string") return warning;
      return `${display(warning?.code)}: ${display(warning?.message)}`;
    })));
    lines.push("");
  }

  lines.push("## 주의");
  lines.push("");
  lines.push(`> ${display(
    report.mandatoryDisclosure,
    "취약도는 현재 매크로 환경에 대한 노출 정도이며, 기대수익률이나 직접적인 매도 신호가 아닙니다."
  )}`);

  return `${lines.join("\n").trim()}\n`;
}

export {
  escapeTableCell,
  renderWeeklyReportMarkdown
};
