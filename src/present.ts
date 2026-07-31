import { buildReasons } from "./reason.js";
import { translateTitles } from "./translate.js";
import type { Article, Mode, PresentedArticle } from "./types.js";

export async function presentArticles(
  articles: Article[],
  options: { mode: Mode; keywords: string[]; translateEnglish: boolean },
): Promise<PresentedArticle[]> {
  const englishTitles = options.translateEnglish
    ? articles.filter((a) => a.lang === "en").map((a) => a.title)
    : [];
  const translations = englishTitles.length > 0 ? await translateTitles(englishTitles) : new Map();

  return articles.map((article) => {
    const reasons = buildReasons(article, {
      mode: options.mode,
      keywords: options.keywords,
    });
    const titleJa = translations.get(article.title);
    return {
      ...article,
      reasons,
      titleJa: titleJa ?? undefined,
    };
  });
}
