import type { Article } from "./types.js";

function jstDateLabel(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function line(article: Article, index: number): string {
  return `${index}. <${article.url}|${escapeSlack(article.title)}> — ${article.sourceName}`;
}

function escapeSlack(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function formatDigest(japanese: Article[], english: Article[]): string {
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
  lines.push("*■ 英語（参考）*");
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

export function formatAlert(articles: Article[]): string {
  const lines: string[] = ["*重要AIニュース*"];
  for (const article of articles) {
    const badge = article.official ? "公式" : "キーワード";
    lines.push(
      `・<${article.url}|${escapeSlack(article.title)}> — ${article.sourceName} (${badge})`,
    );
  }
  return lines.join("\n");
}
