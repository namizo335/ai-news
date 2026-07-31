/** Normalize URL for stable dedupe keys. */
export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    url.hash = "";
    if (
      (url.protocol === "http:" && url.port === "80") ||
      (url.protocol === "https:" && url.port === "443")
    ) {
      url.port = "";
    }
    // Drop common tracking params
    const drop = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref"];
    for (const key of drop) {
      url.searchParams.delete(key);
    }
    let href = url.toString();
    if (href.endsWith("/") && url.pathname !== "/") {
      href = href.slice(0, -1);
    }
    return href;
  } catch {
    return raw.trim();
  }
}

export function articleIdFromUrl(url: string): string {
  return normalizeUrl(url);
}
