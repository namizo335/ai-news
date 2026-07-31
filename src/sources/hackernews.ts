import Parser from "rss-parser";
import { articleIdFromUrl, normalizeUrl } from "../normalize.js";
import type { Article, SourceConfig } from "../types.js";

interface HnItem {
  id: number;
  title?: string;
  url?: string;
  score?: number;
  time?: number;
  type?: string;
  dead?: boolean;
  deleted?: boolean;
}

const HN_API = "https://hacker-news.firebaseio.com/v0";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "ai-news-slack/1.0 (+https://github.com/ai-news-slack)",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
});

export async function fetchHackerNewsSource(
  source: SourceConfig,
  fetchCount: number,
): Promise<Article[]> {
  try {
    return await fetchViaHnrss(source, fetchCount);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[warn] hnrss failed (${message}), falling back to Firebase API`);
    return fetchViaFirebase(source, fetchCount);
  }
}

async function fetchViaHnrss(source: SourceConfig, fetchCount: number): Promise<Article[]> {
  const terms = source.queryTerms?.length
    ? source.queryTerms.join(" OR ")
    : "AI OR LLM OR GPT";
  const feedUrl = `https://hnrss.org/newest?q=${encodeURIComponent(terms)}&count=${fetchCount}`;
  const feed = await parser.parseURL(feedUrl);
  const articles: Article[] = [];

  for (const item of feed.items.slice(0, fetchCount)) {
    const link = item.link?.trim();
    const title = item.title?.trim();
    if (!link || !title) continue;

    const points = extractPoints(item.contentSnippet ?? item.content ?? item.summary ?? "");
    const publishedAt = item.isoDate ? new Date(item.isoDate) : new Date();
    const url = normalizeUrl(link);

    articles.push({
      id: articleIdFromUrl(url),
      title,
      url,
      sourceId: source.id,
      sourceName: source.name,
      lang: source.lang,
      official: source.official,
      publishedAt: Number.isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
      score: points,
    });
  }

  if (articles.length === 0) {
    throw new Error("hnrss returned 0 items");
  }
  return articles;
}

async function fetchViaFirebase(source: SourceConfig, fetchCount: number): Promise<Article[]> {
  const terms = (source.queryTerms ?? ["AI"]).map((t) => t.toLowerCase());
  const half = Math.ceil(Math.min(fetchCount, 30) / 2);
  const [newest, top] = await Promise.all([
    fetchJson<number[]>(`${HN_API}/newstories.json`),
    fetchJson<number[]>(`${HN_API}/topstories.json`),
  ]);
  const selected = [...new Set([...newest.slice(0, half), ...top.slice(0, half)])].slice(
    0,
    Math.min(fetchCount, 30),
  );

  const items = await mapPool(selected, 10, async (id) => {
    try {
      return await fetchJson<HnItem>(`${HN_API}/item/${id}.json`);
    } catch {
      return null;
    }
  });

  const articles: Article[] = [];
  for (const item of items) {
    if (!item || item.dead || item.deleted || item.type !== "story" || !item.title) continue;
    const titleLower = item.title.toLowerCase();
    if (!terms.some((term) => titleLower.includes(term.toLowerCase()))) continue;

    const url = normalizeUrl(item.url ?? `https://news.ycombinator.com/item?id=${item.id}`);
    articles.push({
      id: articleIdFromUrl(url),
      title: item.title,
      url,
      sourceId: source.id,
      sourceName: source.name,
      lang: source.lang,
      official: source.official,
      publishedAt: item.time ? new Date(item.time * 1000) : new Date(),
      score: item.score ?? 0,
    });
  }
  return articles;
}

function extractPoints(text: string): number {
  const match = text.match(/Points:\s*(\d+)/i) ?? text.match(/(\d+)\s+points/i);
  return match ? Number(match[1]) : 0;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HN API ${res.status}: ${url}`);
  return (await res.json()) as T;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}
