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

  if (!data.verses) {
    data.verses = [];
  }

  cache.set(key, data);
  return data;
}

/**
 * Fetch a reference in multiple free translations at once.
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

/* ================================================================== */
/*  FULL BIBLE OFFLINE STORAGE                                        */
/* ================================================================== */

const FULL_BIBLE_DB_NAME = "joy-journey-bible";
const FULL_BIBLE_STORE = "full-bibles";

async function getFullBibleDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FULL_BIBLE_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FULL_BIBLE_STORE)) {
        db.createObjectStore(FULL_BIBLE_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Fetch full Bible JSON from your public/bibles/ folder.
 * Uses Vite's BASE_URL so it works on GitHub Pages (/joy-in-the-journey/)
 * as well as locally (/).
 */
export async function fetchFullBible(version: string = "kjv"): Promise<any> {
  // import.meta.env.BASE_URL is set by vite.config.ts base option.
  // On GitHub Pages this becomes "/joy-in-the-journey/".
  // On localhost this is "/".
  const base = import.meta.env.BASE_URL ?? "/";
  // Normalise: ensure base ends with /
  const normalised = base.endsWith("/") ? base : `${base}/`;
  const url = `${normalised}bibles/${version.toLowerCase()}.json`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to download ${version.toUpperCase()} Bible (HTTP ${res.status}). ` +
      `Tried: ${url} — make sure public/bibles/${version.toLowerCase()}.json exists.`
    );
  }
  return res.json();
}

/** Save full Bible to IndexedDB */
export async function saveFullBibleToDB(version: string, data: any): Promise<void> {
  const db = await getFullBibleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FULL_BIBLE_STORE, "readwrite");
    tx.objectStore(FULL_BIBLE_STORE).put(data, version.toLowerCase());
    tx.oncomplete = () => {
      // Also set the localStorage flag so isFullBibleDownloaded() works instantly
      localStorage.setItem(`fullBible_${version.toLowerCase()}`, "true");
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Check if a full Bible has been downloaded.
 * Checks localStorage flag (fast, sync) set by saveFullBibleToDB.
 */
export function isFullBibleDownloaded(version: string): boolean {
  return localStorage.getItem(`fullBible_${version.toLowerCase()}`) === "true";
}

/**
 * Try to read a verse from the locally-downloaded full Bible in IndexedDB.
 * Returns null if not downloaded or verse not found.
 */
export async function getVerseFromLocalBible(
  version: string,
  bookName: string,
  chapter: number,
  verse: number,
): Promise<string | null> {
  if (!isFullBibleDownloaded(version)) return null;
  try {
    const db = await getFullBibleDB();
    const data: any = await new Promise((resolve, reject) => {
      const tx = db.transaction(FULL_BIBLE_STORE, "readonly");
      const req = tx.objectStore(FULL_BIBLE_STORE).get(version.toLowerCase());
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
    if (!data) return null;
    // Support common JSON shapes:
    // Shape A: data[bookName][chapter][verse] = "text"
    // Shape B: data.books[bookIndex].chapters[ch].verses[v] = "text"
    const byBook = data[bookName] ?? data[bookName.toLowerCase()];
    if (byBook) {
      const byChapter = byBook[chapter] ?? byBook[String(chapter)];
      if (byChapter) {
        return byChapter[verse] ?? byChapter[String(verse)] ?? null;
      }
    }
    return null;
  } catch {
    return null;
  }
}