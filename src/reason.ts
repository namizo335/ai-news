import { matchesKeywords } from "./filter.js";
import type { Article, Mode } from "./types.js";

export function findMatchedKeywords(title: string, keywords: string[]): string[] {
  const lower = title.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase()));
}

export function buildReasons(
  article: Article,
  options: { mode: Mode; keywords: string[] },
  now = new Date(),
): string[] {
  const reasons: string[] = [];

  if (article.official) {
    reasons.push("公式ソース");
  }

  const matched = findMatchedKeywords(article.title, options.keywords);
  if (matched.length > 0) {
    reasons.push(`キーワード「${matched.slice(0, 3).join(" / ")}」`);
  } else if (options.mode === "alert" && !article.official) {
    // Should be rare; keep a fallback label
    reasons.push("キーワード一致");
  }

  if (options.mode === "digest") {
    reasons.push(article.lang === "ja" ? "日本語枠" : "英語参考枠");
  }

  const ageHours = Math.max(
    0,
    (now.getTime() - article.publishedAt.getTime()) / (1000 * 60 * 60),
  );
  if (ageHours < 6) {
    reasons.push(`${Math.max(1, Math.round(ageHours))}時間以内`);
  } else if (ageHours < 36) {
    reasons.push("直近の新着");
  }

  if ((article.score ?? 0) >= 50) {
    reasons.push(`HNスコア ${article.score}`);
  } else if (article.sourceId === "hackernews" && (article.score ?? 0) > 0) {
    reasons.push(`HNスコア ${article.score}`);
  }

  // Ensure at least one reason
  if (reasons.length === 0) {
    reasons.push(matchesKeywords(article.title, options.keywords) ? "関連ニュース" : "新着");
  }

  return reasons;
}
