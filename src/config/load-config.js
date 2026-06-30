import { readFile } from "node:fs/promises";

export async function loadJsonFile(path) {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw);
}

export async function loadIndicatorConfig(path = "config/indicators.json") {
  const config = await loadJsonFile(path);

  if (!config?.providerDefaults || !config?.indicators) {
    throw new Error("Invalid indicator configuration: missing providerDefaults or indicators");
  }

  return config;
}
