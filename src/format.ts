import type { PresentedArticle } from "./types.js";

function jstDateLabel(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function escapeSlack(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function line(article: PresentedArticle, index: number): string {
  const primaryTitle = article.titleJa ?? article.title;
  const link = `<${article.url}|${escapeSlack(primaryTitle)}>`;
  const parts = [`${index}. ${link} — ${article.sourceName}`];

  if (article.titleJa) {
    parts.push(`   原文: ${escapeSlack(article.title)}`);
  }
  if (article.reasons.length > 0) {
    parts.push(`   理由: ${article.reasons.join(" / ")}`);
  }
  return parts.join("\n");
}

function alertLine(article: PresentedArticle): string {
  const primaryTitle = article.titleJa ?? article.title;
  const parts = [
    `・<${article.url}|${escapeSlack(primaryTitle)}> — ${article.sourceName}`,
  ];
  if (article.titleJa) {
    parts.push(`  原文: ${escapeSlack(article.title)}`);
  }
  if (article.reasons.length > 0) {
    parts.push(`  理由: ${article.reasons.join(" / ")}`);
  }
  return parts.join("\n");
}

export function formatDigest(japanese: PresentedArticle[], english: PresentedArticle[]): string {
  const date = jstDateLabel();
  const lines: string[] = [`*AIニュース ${date}*`];

  lines.push("");
  lines.push("*■ 日本語*");
  if (japanese.length === 0) {
    lines.push("_本日の日本語新着はありません_");
  } else {
    japanese.forEach((a, i) => lines.push(line(a, i + 1)));
  }

  lines.push("");
  lines.push("*■ 英語（参考・タイトル訳）*");
  if (english.length === 0) {
    lines.push("_本日の英語参考はありません_");
  } else {
    english.forEach((a, i) => lines.push(line(a, i + 1)));
  }

  if (japanese.length === 0 && english.length === 0) {
    lines.push("");
    lines.push("本日の新着は少ないです。ソースを確認しましたが対象記事がありませんでした。");
  } else if (japanese.length + english.length < 4) {
    lines.push("");
    lines.push("本日の新着は少なめです。");
  }

  return lines.join("\n");
}

export function formatAlert(articles: PresentedArticle[]): string {
  const lines: string[] = ["*重要AIニュース*"];
  for (const article of articles) {
    lines.push(alertLine(article));
  }
  return lines.join("\n");
}
