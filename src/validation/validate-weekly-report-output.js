import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { loadJsonFile } from "../config/load-config.js";

let compiledValidator;

export async function getWeeklyReportOutputValidator(
  schemaPath = "data/schema/weekly-report-output.schema.json"
) {
  if (!compiledValidator) {
    const [schema, reportFactsSchema, weeklyAnalysisSchema] = await Promise.all([
      loadJsonFile(schemaPath),
      loadJsonFile("data/schema/report-facts.schema.json"),
      loadJsonFile("data/schema/weekly-analysis-output.schema.json")
    ]);
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    ajv.addSchema(reportFactsSchema);
    ajv.addSchema(weeklyAnalysisSchema);
    compiledValidator = ajv.compile(schema);
  }
  return compiledValidator;
}

export async function validateWeeklyReportOutput(output) {
  const validate = await getWeeklyReportOutputValidator();
  const valid = validate(output);
  return {
    valid,
    errors: valid ? [] : validate.errors ?? []
  };
}
