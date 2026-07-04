import { validateIndicatorOutput } from "./validate-output.js";

export async function validateIndicatorOutputs(outputs) {
  const results = [];

  for (const output of outputs) {
    const validation = await validateIndicatorOutput(output);
    results.push({
      indicatorId: output.indicatorId,
      valid: validation.valid,
      errors: validation.errors
    });
  }

  return results;
}
