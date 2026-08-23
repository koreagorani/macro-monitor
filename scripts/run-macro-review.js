import { buildMacroReview, compactErrors } from "./run-weekly-report.js";

try {
  const asOf = process.argv[2] ?? new Date().toISOString().slice(0, 10);
  const macroReviewOutput = await buildMacroReview({ asOf });
  console.log(JSON.stringify(macroReviewOutput, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    code: error.code ?? "MACRO_REVIEW_GENERATION_UNEXPECTED_ERROR",
    message: error.code
      ? error.message
      : "Macro review generation failed unexpectedly.",
    errors: compactErrors(error.errors ?? [])
  }, null, 2));
  process.exitCode = 1;
}
