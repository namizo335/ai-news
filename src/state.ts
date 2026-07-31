import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

interface SentState {
  urls: string[];
  updatedAt: string;
}

export function loadSentIds(statePath: string): Set<string> {
  if (!existsSync(statePath)) {
    return new Set();
  }
  try {
    const raw = JSON.parse(readFileSync(statePath, "utf8")) as SentState | string[];
    const urls = Array.isArray(raw) ? raw : (raw.urls ?? []);
    return new Set(urls);
  } catch {
    return new Set();
  }
}

export function saveSentIds(statePath: string, ids: Set<string>, retention: number): void {
  const urls = [...ids].slice(-retention);
  const payload: SentState = {
    urls,
    updatedAt: new Date().toISOString(),
  };
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export function markSent(existing: Set<string>, articleIds: string[]): Set<string> {
  const next = new Set(existing);
  for (const id of articleIds) {
    next.add(id);
  }
  return next;
}
