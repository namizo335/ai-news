import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { KeywordsFile, SourcesFile } from "./types.js";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");

function readJson<T>(relativePath: string): T {
  const fullPath = join(rootDir, relativePath);
  return JSON.parse(readFileSync(fullPath, "utf8")) as T;
}

export function loadSourcesConfig(): SourcesFile {
  return readJson<SourcesFile>("config/sources.json");
}

export function loadKeywordsConfig(): KeywordsFile {
  return readJson<KeywordsFile>("config/keywords.json");
}

export function getProjectRoot(): string {
  return rootDir;
}
