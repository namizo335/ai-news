import Parser from "rss-parser";
import { articleIdFromUrl, normalizeUrl } from "../normalize.js";
import type { Article, SourceConfig } from "../types.js";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "ai-news-slack/1.0 (+https://github.com/ai-news-slack)",
    Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
  },
});

export async function fetchRssSource(source: SourceConfig): Promise<Article[]> {
  if (!source.url) {
    throw new Error(`RSS source ${source.id} has no url`);
  }

  const feed = await parser.parseURL(source.url);
  const articles: Article[] = [];
  const items = feed.items.slice(0, 40);

  for (const item of items) {
    const link = item.link?.trim();
    const title = item.title?.trim();
    if (!link || !title) continue;

    const publishedAt = parseDate(item.isoDate ?? item.pubDate);
    const url = normalizeUrl(link);

    articles.push({
      id: articleIdFromUrl(url),
      title: decodeEntities(title),
      url,
      sourceId: source.id,
      sourceName: source.name,
      lang: source.lang,
      official: source.official,
      publishedAt,
    });
  }

  return articles;
}

function parseDate(value?: string): Date {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}
