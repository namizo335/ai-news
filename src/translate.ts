const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

/** Heuristic: skip translation when title already looks mostly Japanese. */
export function looksJapanese(text: string): boolean {
  const jp = (text.match(/[\u3040-\u30ff\u4e00-\u9fff]/g) ?? []).join("").length;
  return jp >= Math.min(4, Math.ceil(text.length * 0.25));
}

export async function translateToJapanese(text: string): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed || looksJapanese(trimmed)) {
    return null;
  }

  const url = new URL(MYMEMORY_URL);
  url.searchParams.set("q", trimmed.slice(0, 450));
  url.searchParams.set("langpair", "en|ja");

  const email = process.env.MYMEMORY_EMAIL?.trim();
  if (email) {
    url.searchParams.set("de", email);
  }

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      console.error(`[translate] HTTP ${res.status}`);
      return null;
    }

    const data = (await res.json()) as {
      responseStatus?: number;
      responseData?: { translatedText?: string };
    };

    if (data.responseStatus !== 200) {
      console.error(`[translate] status ${data.responseStatus}`);
      return null;
    }

    const translated = data.responseData?.translatedText?.trim();
    if (!translated || translated.toLowerCase() === trimmed.toLowerCase()) {
      return null;
    }
    // MyMemory sometimes returns QUOTA EXCEEDED in the text field
    if (/MYMEMORY WARNING|QUOTA EXCEEDED/i.test(translated)) {
      console.error("[translate] quota exceeded");
      return null;
    }

    return translated;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[translate] ${message}`);
    return null;
  }
}

export async function translateTitles(titles: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (const title of titles) {
    const translated = await translateToJapanese(title);
    if (translated) {
      result.set(title, translated);
    }
    // Be gentle with the free API
    await sleep(200);
  }
  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
