import type { Article, LimitsConfig, SourceConfig } from "../types.js";
import { fetchHackerNewsSource } from "./hackernews.js";
import { fetchRssSource } from "./rss.js";

export async function fetchAllSources(
  sources: SourceConfig[],
  limits: LimitsConfig,
): Promise<{ articles: Article[]; errors: string[] }> {
  const articles: Article[] = [];
  const errors: string[] = [];

  const results = await Promise.allSettled(
    sources.map(async (source) => {
      if (source.type === "hackernews") {
        return fetchHackerNewsSource(source, limits.hnFetchCount);
      }
      return fetchRssSource(source);
    }),
  );

  for (let i = 0; i < results.length; i++) {
    const source = sources[i]!;
    const result = results[i]!;
    if (result.status === "fulfilled") {
      articles.push(...result.value);
      console.error(`[ok] ${source.id}: ${result.value.length} items`);
    } else {
      const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
      errors.push(`${source.id}: ${message}`);
      console.error(`[fail] ${source.id}: ${message}`);
    }
  }

  return { articles, errors };
}
