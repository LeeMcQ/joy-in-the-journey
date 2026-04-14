import { BIBLE_BOOKS, type BibleBook } from "@/lib/bibleData";
import { normaliseReference } from "@/lib/scriptureUtils";

/* ── Types ────────────────────────────────────────────── */

export interface LocalVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface VerseResult {
  reference: string;
  translation: TranslationId;
  verses: LocalVerse[];
  text: string;
}

export type TranslationId = "kjv" | "web" | "asv";

export interface TranslationInfo {
  id: TranslationId;
  name: string;
  fullName: string;
  downloadable: boolean;
}

export const LOCAL_TRANSLATIONS: TranslationInfo[] = [
  { id: "kjv", name: "KJV", fullName: "King James Version", downloadable: true },
  { id: "web", name: "WEB", fullName: "World English Bible", downloadable: true },
  { id: "asv", name: "ASV", fullName: "American Standard Version (1901)", downloadable: true },
];

/** Online-only translations — linked to BibleGateway */
export interface OnlineTranslation {
  id: string;
  name: string;
  fullName: string;
  gatewayId: string;
}

export const ONLINE_TRANSLATIONS: OnlineTranslation[] = [
  { id: "gnb", name: "GNB", fullName: "Good News Bible", gatewayId: "GNT" },
  { id: "esv", name: "ESV", fullName: "English Standard Version", gatewayId: "ESV" },
];

export function bibleGatewayUrl(ref: string, gatewayId: string): string {
  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=${gatewayId}`;
}

/* ── IDB Cache ────────────────────────────────────────── */

const DB_NAME = "joy-bible-cache";
const STORE_NAME = "chapters";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function cacheKey(t: TranslationId, book: string, ch: number): string {
  return `${t}:${book.toLowerCase().replace(/\s+/g, "")}:${ch}`;
}

async function getFromCache(key: string): Promise<LocalVerse[] | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function setInCache(key: string, verses: LocalVerse[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(verses, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch { /* silently fail */ }
}

/* ── Fetch with retry + backoff ───────────────────────── */

interface ApiVerse { book_name: string; chapter: number; verse: number; text: string; }
interface ApiResponse { reference: string; verses: ApiVerse[]; text: string; }

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

/** bible-api.com supported translations */
const BIBLE_API_TRANSLATIONS = new Set<TranslationId>(["kjv", "web"]);

async function fetchFromApi(
  reference: string,
  translation: TranslationId,
  retries = 3,
): Promise<LocalVerse[]> {
  // ASV not on bible-api.com — use bolls.life API instead
  if (!BIBLE_API_TRANSLATIONS.has(translation)) {
    return fetchFromBolls(reference, translation, retries);
  }

  const encoded = encodeURIComponent(reference);
  const url = `https://bible-api.com/${encoded}?translation=${translation}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ApiResponse = await res.json();
      return (data.verses ?? []).map((v) => ({
        book: v.book_name, chapter: v.chapter, verse: v.verse, text: v.text.trim(),
      }));
    } catch (err) {
      if (attempt < retries - 1) { await sleep(1000 * (attempt + 1)); continue; }
      throw err;
    }
  }
  throw new Error("Max retries reached");
}

/** bolls.life API — supports ASV and many other translations */
const BOLLS_TRANSLATION_MAP: Record<string, string> = { asv: "ASV" };

async function fetchFromBolls(
  reference: string,
  translation: TranslationId,
  retries = 3,
): Promise<LocalVerse[]> {
  // Parse "Genesis 1" or "John 3:16" into book + chapter
  const m = reference.match(/^(.+?)\s+(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?$/);
  if (!m) throw new Error(`Cannot parse reference: ${reference}`);

  const bookName = m[1].trim();
  const chapter = parseInt(m[2], 10);
  const verseStart = m[3] ? parseInt(m[3], 10) : undefined;
  const verseEnd = m[4] ? parseInt(m[4], 10) : undefined;

  // Find the book index (1-based) in the Bible
  const bookIndex = BIBLE_BOOKS.findIndex(
    (b) => b.name.toLowerCase() === bookName.toLowerCase()
  ) + 1;
  if (bookIndex === 0) throw new Error(`Unknown book: ${bookName}`);

  const bollsId = BOLLS_TRANSLATION_MAP[translation] ?? translation.toUpperCase();
  const url = `https://bolls.life/get-chapter/${bollsId}/${bookIndex}/${chapter}/`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { verse: number; text: string }[] = await res.json();

      let verses = data.map((v) => ({
        book: bookName, chapter, verse: v.verse, text: v.text.trim(),
      }));

      // Filter to specific verse range if requested
      if (verseStart != null) {
        const end = verseEnd ?? verseStart;
        verses = verses.filter((v) => v.verse >= verseStart && v.verse <= end);
      }

      return verses;
    } catch (err) {
      if (attempt < retries - 1) { await sleep(1000 * (attempt + 1)); continue; }
      // If bolls.life fails, try bible-api.com as last resort
      try {
        return await fetchFromBibleApi(reference, translation);
      } catch {
        throw err;
      }
    }
  }
  throw new Error("Max retries reached");
}

/** Direct bible-api.com call (fallback for bolls.life failure) */
async function fetchFromBibleApi(reference: string, translation: TranslationId): Promise<LocalVerse[]> {
  const encoded = encodeURIComponent(reference);
  const url = `https://bible-api.com/${encoded}?translation=${translation}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: ApiResponse = await res.json();
  return (data.verses ?? []).map((v) => ({
    book: v.book_name, chapter: v.chapter, verse: v.verse, text: v.text.trim(),
  }));
}

/* ── Public: Get chapter ──────────────────────────────── */

export async function getChapter(
  bookName: string, chapter: number, translation: TranslationId = "kjv",
): Promise<VerseResult> {
  const key = cacheKey(translation, bookName, chapter);
  const cached = await getFromCache(key);
  if (cached && cached.length > 0) {
    return { reference: `${bookName} ${chapter}`, translation, verses: cached, text: cached.map((v) => v.text).join(" ") };
  }
  try {
    const verses = await fetchFromApi(`${bookName} ${chapter}`, translation);
    if (verses.length > 0) await setInCache(key, verses);
    return { reference: `${bookName} ${chapter}`, translation, verses, text: verses.map((v) => v.text).join(" ") };
  } catch (err) {
    throw new Error(navigator.onLine
      ? `Failed to load ${bookName} ${chapter}: ${err}`
      : "You're offline. Read this chapter online first to cache it.");
  }
}

/* ── Public: Get verses ───────────────────────────────── */

export async function getVerses(
  bookName: string, chapter: number, verseStart: number, verseEnd?: number, translation: TranslationId = "kjv",
): Promise<VerseResult> {
  const key = cacheKey(translation, bookName, chapter);
  const cached = await getFromCache(key);
  const end = verseEnd ?? verseStart;
  if (cached && cached.length > 0) {
    const filtered = cached.filter((v) => v.verse >= verseStart && v.verse <= end);
    const refStr = verseEnd ? `${bookName} ${chapter}:${verseStart}-${verseEnd}` : `${bookName} ${chapter}:${verseStart}`;
    return { reference: refStr, translation, verses: filtered, text: filtered.map((v) => v.text).join(" ") };
  }
  const refStr = verseEnd ? `${bookName} ${chapter}:${verseStart}-${verseEnd}` : `${bookName} ${chapter}:${verseStart}`;
  try {
    const verses = await fetchFromApi(refStr, translation);
    return { reference: refStr, translation, verses, text: verses.map((v) => v.text).join(" ") };
  } catch (err) {
    throw new Error(navigator.onLine ? `Failed: ${err}` : "Offline — read this verse online first.");
  }
}

/* ── Public: Lookup by raw reference ──────────────────── */

export async function lookupReference(rawRef: string, translation: TranslationId = "kjv"): Promise<VerseResult> {
  const normalised = normaliseReference(rawRef);
  const m = normalised.match(/^(.+?)\s+(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?$/);
  if (!m) return { reference: rawRef, translation, verses: [], text: "" };
  const bookName = m[1].trim();
  const chapter = parseInt(m[2], 10);
  const verseStart = m[3] ? parseInt(m[3], 10) : undefined;
  const verseEnd = m[4] ? parseInt(m[4], 10) : undefined;
  if (verseStart != null) return getVerses(bookName, chapter, verseStart, verseEnd, translation);
  return getChapter(bookName, chapter, translation);
}

/* ── Public: Multi-translation ────────────────────────── */

export async function lookupMultiTranslation(rawRef: string): Promise<Map<TranslationId, VerseResult>> {
  const results = await Promise.allSettled(LOCAL_TRANSLATIONS.map((t) => lookupReference(rawRef, t.id)));
  const map = new Map<TranslationId, VerseResult>();
  LOCAL_TRANSLATIONS.forEach((t, i) => {
    const r = results[i];
    if (r.status === "fulfilled") map.set(t.id, r.value);
  });
  return map;
}

/* ── Download progress ────────────────────────────────── */

export interface DownloadProgress {
  total: number;
  done: number;
  currentBook: string;
  status: "idle" | "downloading" | "done" | "error";
  error?: string;
}

const TOTAL_CHAPTERS = BIBLE_BOOKS.reduce((s, b) => s + b.chapters, 0);

export async function downloadTranslation(
  translation: TranslationId,
  onProgress: (p: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  let done = 0;
  onProgress({ total: TOTAL_CHAPTERS, done: 0, currentBook: "", status: "downloading" });

  for (const book of BIBLE_BOOKS) {
    if (signal?.aborted) throw new Error("Cancelled");
    onProgress({ total: TOTAL_CHAPTERS, done, currentBook: book.name, status: "downloading" });

    for (let ch = 1; ch <= book.chapters; ch++) {
      if (signal?.aborted) throw new Error("Cancelled");
      const key = cacheKey(translation, book.name, ch);
      const existing = await getFromCache(key);

      if (!existing || existing.length === 0) {
        try {
          const verses = await fetchFromApi(`${book.name} ${ch}`, translation, 5);
          if (verses.length > 0) await setInCache(key, verses);
          // 300ms between requests to avoid rate limiting
          await sleep(300);
        } catch (err) {
          // Log but continue — skip failed chapters instead of stopping entirely
          console.warn(`Failed: ${book.name} ${ch} (${translation}):`, err);
          // Wait longer after an error then continue
          await sleep(2000);
        }
      }
      done++;
      if (ch % 3 === 0 || ch === book.chapters) {
        onProgress({ total: TOTAL_CHAPTERS, done, currentBook: book.name, status: "downloading" });
      }
    }
  }
  onProgress({ total: TOTAL_CHAPTERS, done, currentBook: "", status: "done" });
}

/* ── Cache stats ──────────────────────────────────────── */

export async function getCachedChapterCount(translation: TranslationId): Promise<number> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAllKeys();
      req.onsuccess = () => {
        const keys = req.result as string[];
        resolve(keys.filter((k) => k.startsWith(`${translation}:`)).length);
      };
      req.onerror = () => resolve(0);
    });
  } catch { return 0; }
}

export function getBookList(): BibleBook[] { return BIBLE_BOOKS; }
