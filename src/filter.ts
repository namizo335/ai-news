import type { Article, LimitsConfig } from "./types.js";

export function dedupeArticles(articles: Article[]): Article[] {
  const seen = new Map<string, Article>();
  for (const article of articles) {
    const existing = seen.get(article.id);
    if (!existing) {
      seen.set(article.id, article);
      continue;
    }
    // Prefer higher score / newer
    const existingScore = existing.score ?? 0;
    const nextScore = article.score ?? 0;
    if (nextScore > existingScore || article.publishedAt > existing.publishedAt) {
      seen.set(article.id, article);
    }
  }
  return [...seen.values()];
}

export function filterByAge(articles: Article[], maxAgeHours: number, now = new Date()): Article[] {
  const cutoff = now.getTime() - maxAgeHours * 60 * 60 * 1000;
  return articles.filter((a) => a.publishedAt.getTime() >= cutoff);
}

export function excludeSent(articles: Article[], sentIds: Set<string>): Article[] {
  return articles.filter((a) => !sentIds.has(a.id));
}

export function matchesKeywords(title: string, keywords: string[]): boolean {
  const lower = title.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

export function rankArticles(articles: Article[], now = new Date()): Article[] {
  return [...articles].sort((a, b) => scoreArticle(b, now) - scoreArticle(a, now));
}

function scoreArticle(article: Article, now: Date): number {
  const ageHours = Math.max(0, (now.getTime() - article.publishedAt.getTime()) / (1000 * 60 * 60));
  const freshness = Math.max(0, 48 - ageHours); // newer is better
  const hnBoost = (article.score ?? 0) * 0.15;
  const officialBoost = article.official ? 8 : 0;
  return freshness + hnBoost + officialBoost;
}

/** Pick top N while limiting how many come from the same source. */
export function pickDiverse(articles: Article[], limit: number, maxPerSource = 2): Article[] {
  const picked: Article[] = [];
  const perSource = new Map<string, number>();

  for (const article of articles) {
    if (picked.length >= limit) break;
    const count = perSource.get(article.sourceId) ?? 0;
    if (count >= maxPerSource) continue;
    picked.push(article);
    perSource.set(article.sourceId, count + 1);
  }

  // If still short, fill ignoring diversity
  if (picked.length < limit) {
    const pickedIds = new Set(picked.map((a) => a.id));
    for (const article of articles) {
      if (picked.length >= limit) break;
      if (pickedIds.has(article.id)) continue;
      picked.push(article);
    }
  }

  return picked;
}

export function selectDigest(
  articles: Article[],
  limits: LimitsConfig,
): { japanese: Article[]; english: Article[] } {
  const ranked = rankArticles(articles);
  const japanese = pickDiverse(
    ranked.filter((a) => a.lang === "ja"),
    limits.digestJapanese,
  );
  const english = pickDiverse(
    ranked.filter((a) => a.lang === "en"),
    limits.digestEnglish,
  );
  return { japanese, english };
}

export function selectAlerts(
  articles: Article[],
  keywords: string[],
  limit = 5,
): Article[] {
  const ranked = rankArticles(articles);
  const official = ranked.filter((a) => a.official);
  // Keyword path is English-only: JP AI feeds almost always match brand words.
  const keywordHits = ranked.filter(
    (a) => !a.official && a.lang === "en" && matchesKeywords(a.title, keywords),
  );

  const picked: Article[] = [];
  const seen = new Set<string>();
  for (const article of [...official, ...keywordHits]) {
    if (picked.length >= limit) break;
    if (seen.has(article.id)) continue;
    seen.add(article.id);
    picked.push(article);
  }
  return picked;
}
