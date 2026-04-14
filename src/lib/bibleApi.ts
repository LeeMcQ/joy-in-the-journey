/* ================================================================== */
/*  bible-api.com client                                              */
/*  Free API — supports: "kjv", "web" (World English Bible)           */
/*  For NIV/ESV we fall back to BibleGateway links (licensed content) */
/* ================================================================== */

export interface BibleVerse {
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleApiResponse {
  reference: string;
  verses: BibleVerse[];
  text: string;
  translation_id: string;
  translation_name: string;
}

/** Translations available from bible-api.com */
export type FreeTranslation = "kjv" | "web";

/** All translations we show — free ones fetched, licensed ones linked */
export interface TranslationConfig {
  id: string;
  name: string;
  fullName: string;
  free: boolean; // true = fetch from API, false = link to BibleGateway
}

export const TRANSLATIONS: TranslationConfig[] = [
  { id: "kjv", name: "KJV", fullName: "King James Version", free: true },
  { id: "web", name: "WEB", fullName: "World English Bible", free: true },
  { id: "niv", name: "NIV", fullName: "New International Version", free: false },
  { id: "esv", name: "ESV", fullName: "English Standard Version", free: false },
];

/* ── In-memory cache ──────────────────────────────────── */
const cache = new Map<string, BibleApiResponse>();

function cacheKey(ref: string, translation: string): string {
  return `${translation}:${ref.toLowerCase().replace(/\s+/g, "")}`;
}

/* ── Fetch ────────────────────────────────────────────── */

export async function fetchVerses(
  reference: string,
  translation: FreeTranslation = "kjv",
): Promise<BibleApiResponse> {
  const key = cacheKey(reference, translation);
  const cached = cache.get(key);
  if (cached) return cached;

  const encoded = encodeURIComponent(reference);
  const url = `https://bible-api.com/${encoded}?translation=${translation}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Bible API error: ${res.status} ${res.statusText}`);
  }

  const data: BibleApiResponse = await res.json();

  // Normalise — API sometimes returns slightly different shapes
  if (!data.verses) {
    data.verses = [];
  }

  cache.set(key, data);
  return data;
}

/**
 * Fetch a reference in multiple free translations at once.
 * Returns a map of translation id → response (or error).
 */
export async function fetchMultiTranslation(
  reference: string,
): Promise<Map<string, BibleApiResponse | Error>> {
  const freeTranslations: FreeTranslation[] = ["kjv", "web"];

  const results = await Promise.allSettled(
    freeTranslations.map((t) => fetchVerses(reference, t)),
  );

  const map = new Map<string, BibleApiResponse | Error>();
  freeTranslations.forEach((t, i) => {
    const r = results[i];
    map.set(t, r.status === "fulfilled" ? r.value : new Error(String(r.reason)));
  });

  return map;
}

/**
 * Fetch an entire chapter.
 */
export async function fetchChapter(
  book: string,
  chapter: number,
  translation: FreeTranslation = "kjv",
): Promise<BibleApiResponse> {
  return fetchVerses(`${book} ${chapter}`, translation);
}

/** Build a BibleGateway link for licensed translations */
export function bibleGatewayUrl(
  reference: string,
  version: string,
): string {
  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(reference)}&version=${version}`;
}
