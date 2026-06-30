import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { loadJsonFile } from "../config/load-config.js";

let compiledValidator;

export async function getIndicatorOutputValidator(
  schemaPath = "data/schema/indicator-output.schema.json"
) {
  if (!compiledValidator) {
    const schema = await loadJsonFile(schemaPath);
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    compiledValidator = ajv.compile(schema);
  }
  return compiledValidator;
}

export async function validateIndicatorOutput(output) {
  const validate = await getIndicatorOutputValidator();
  const valid = validate(output);
  return {
    valid,
    errors: valid ? [] : validate.errors ?? []
  };
}
