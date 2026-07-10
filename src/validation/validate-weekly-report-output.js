import { createJsonValidator } from "./json-schema-validator.js";

const validate = await createJsonValidator("data/schema/weekly-report-output.schema.json");

export async function validateWeeklyReportOutput(value) {
  const valid = validate(value);
  return {
    valid,
    errors: valid ? [] : validate.errors
  };
}
