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

/* ── Base URL helper (GitHub Pages safe) ─────────────── */

/**
 * Returns the correct base path for fetching files from /public/.
 * On GitHub Pages: "/joy-in-the-journey/"
 * On localhost:    "/"
 */
function getBaseUrl(): string {
  const base = import.meta.env.BASE_URL ?? "/";
  return base.endsWith("/") ? base : `${base}/`;
}

/* ── Fetch from local JSON file (public/bibles/) ─────── */

/**
 * Try to load a chapter from the pre-built Bible JSON files in public/bibles/.
 * Returns verses array or null if unavailable.
 *
 * Expected JSON shape (bible-json / Bolls-compatible):
 *   { "Genesis": { "1": { "1": "In the beginning...", "2": "..." } } }
 *   OR array shape from other converters — we handle both.
 */
async function fetchChapterFromLocalJson(
  bookName: string,
  chapter: number,
  translation: TranslationId,
): Promise<LocalVerse[] | null> {
  try {
    const base = getBaseUrl();
    const url = `${base}bibles/${translation.toLowerCase()}.json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data: any = await res.json();

    // Shape A: { BookName: { "chapterNum": { "verseNum": "text" } } }
    const bookData = data[bookName] ?? data[bookName.toLowerCase()];
    if (bookData) {
      const chapterData = bookData[chapter] ?? bookData[String(chapter)];
      if (chapterData && typeof chapterData === "object") {
        const verses: LocalVerse[] = Object.entries(chapterData).map(([vNum, text]) => ({
          book: bookName,
          chapter,
          verse: parseInt(vNum, 10),
          text: String(text).trim(),
        }));
        verses.sort((a, b) => a.verse - b.verse);
        return verses.length > 0 ? verses : null;
      }
    }

    // Shape B: array of books [ { name, chapters: [ { chapter, verses: [{verse, text}] } ] } ]
    if (Array.isArray(data)) {
      const bookEntry = data.find(
        (b: any) => b.name?.toLowerCase() === bookName.toLowerCase()
      );
      if (bookEntry?.chapters) {
        const chEntry = bookEntry.chapters.find((c: any) => c.chapter === chapter || c.chapter === String(chapter));
        if (chEntry?.verses) {
          return (chEntry.verses as any[]).map((v: any) => ({
            book: bookName,
            chapter,
            verse: typeof v.verse === "number" ? v.verse : parseInt(v.verse, 10),
            text: String(v.text).trim(),
          }));
        }
      }
    }

    return null;
  } catch {
    return null;
  }
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
  const m = reference.match(/^(.+?)\s+(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?$/);
  if (!m) throw new Error(`Cannot parse reference: ${reference}`);

  const bookName = m[1].trim();
  const chapter = parseInt(m[2], 10);
  const verseStart = m[3] ? parseInt(m[3], 10) : undefined;
  const verseEnd = m[4] ? parseInt(m[4], 10) : undefined;

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

      if (verseStart != null) {
        const end = verseEnd ?? verseStart;
        verses = verses.filter((v) => v.verse >= verseStart && v.verse <= end);
      }

      return verses;
    } catch (err) {
      if (attempt < retries - 1) { await sleep(1000 * (attempt + 1)); continue; }
      try {
        return await fetchFromBibleApi(reference, translation);
      } catch {
        throw err;
      }
    }
  }
  throw new Error("Max retries reached");
}

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

  // 1. Check IDB cache first
  const cached = await getFromCache(key);
  if (cached && cached.length > 0) {
    return { reference: `${bookName} ${chapter}`, translation, verses: cached, text: cached.map((v) => v.text).join(" ") };
  }

  // 2. Try local JSON file (public/bibles/<translation>.json)
  const localVerses = await fetchChapterFromLocalJson(bookName, chapter, translation);
  if (localVerses && localVerses.length > 0) {
    await setInCache(key, localVerses);
    return { reference: `${bookName} ${chapter}`, translation, verses: localVerses, text: localVerses.map((v) => v.text).join(" ") };
  }

  // 3. Fall back to online API
  try {
    const verses = await fetchFromApi(`${bookName} ${chapter}`, translation);
    if (verses.length > 0) await setInCache(key, verses);
    return { reference: `${bookName} ${chapter}`, translation, verses, text: verses.map((v) => v.text).join(" ") };
  } catch (err) {
    throw new Error(navigator.onLine
      ? `Failed to load ${bookName} ${chapter}: ${err}`
      : "You're offline. Download this Bible translation first, or connect to the internet.");
  }
}

/* ── Public: Get verses ───────────────────────────────── */

export async function getVerses(
  bookName: string, chapter: number, verseStart: number, verseEnd?: number, translation: TranslationId = "kjv",
): Promise<VerseResult> {
  const key = cacheKey(translation, bookName, chapter);
  const end = verseEnd ?? verseStart;

  // 1. Check IDB cache
  const cached = await getFromCache(key);
  if (cached && cached.length > 0) {
    const filtered = cached.filter((v) => v.verse >= verseStart && v.verse <= end);
    const refStr = verseEnd ? `${bookName} ${chapter}:${verseStart}-${verseEnd}` : `${bookName} ${chapter}:${verseStart}`;
    return { reference: refStr, translation, verses: filtered, text: filtered.map((v) => v.text).join(" ") };
  }

  // 2. Try local JSON
  const localVerses = await fetchChapterFromLocalJson(bookName, chapter, translation);
  if (localVerses && localVerses.length > 0) {
    await setInCache(key, localVerses);
    const filtered = localVerses.filter((v) => v.verse >= verseStart && v.verse <= end);
    const refStr = verseEnd ? `${bookName} ${chapter}:${verseStart}-${verseEnd}` : `${bookName} ${chapter}:${verseStart}`;
    return { reference: refStr, translation, verses: filtered, text: filtered.map((v) => v.text).join(" ") };
  }

  // 3. Online API
  const refStr = verseEnd ? `${bookName} ${chapter}:${verseStart}-${verseEnd}` : `${bookName} ${chapter}:${verseStart}`;
  try {
    const verses = await fetchFromApi(refStr, translation);
    return { reference: refStr, translation, verses, text: verses.map((v) => v.text).join(" ") };
  } catch (err) {
    throw new Error(navigator.onLine ? `Failed: ${err}` : "Offline — download this Bible translation first.");
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

/**
 * Download entire translation by fetching each chapter from:
 * 1. Local JSON file first (fast, no rate limiting) — public/bibles/<id>.json
 * 2. Online API as fallback per chapter
 * All chapters are stored in IndexedDB for offline use.
 */
export async function downloadTranslation(
  translation: TranslationId,
  onProgress: (p: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  let done = 0;
  onProgress({ total: TOTAL_CHAPTERS, done: 0, currentBook: "", status: "downloading" });

  // First try to load the full JSON file at once (much faster than chapter-by-chapter API)
  try {
    const base = getBaseUrl();
    const url = `${base}bibles/${translation.toLowerCase()}.json`;
    const res = await fetch(url, { signal });

    if (res.ok) {
      const data: any = await res.json();
      onProgress({ total: TOTAL_CHAPTERS, done: 0, currentBook: "Processing…", status: "downloading" });

      for (const book of BIBLE_BOOKS) {
        if (signal?.aborted) throw new Error("Cancelled");
        const bookData = data[book.name] ?? data[book.name.toLowerCase()];
        if (bookData) {
          for (let ch = 1; ch <= book.chapters; ch++) {
            if (signal?.aborted) throw new Error("Cancelled");
            const key = cacheKey(translation, book.name, ch);
            const existing = await getFromCache(key);
            if (!existing || existing.length === 0) {
              const chData = bookData[ch] ?? bookData[String(ch)];
              if (chData && typeof chData === "object") {
                const verses: LocalVerse[] = Object.entries(chData).map(([vNum, text]) => ({
                  book: book.name, chapter: ch, verse: parseInt(vNum, 10), text: String(text).trim(),
                }));
                verses.sort((a, b) => a.verse - b.verse);
                if (verses.length > 0) await setInCache(key, verses);
              }
            }
            done++;
          }
        } else {
          // Book not found in JSON — count chapters as done anyway
          done += book.chapters;
        }
        onProgress({ total: TOTAL_CHAPTERS, done, currentBook: book.name, status: "downloading" });
      }

      onProgress({ total: TOTAL_CHAPTERS, done: TOTAL_CHAPTERS, currentBook: "", status: "done" });
      return;
    }
  } catch (err: any) {
    if (err?.name === "AbortError" || String(err).includes("Cancelled")) throw err;
    // Local JSON not available — fall through to API download below
    console.warn(`Local Bible JSON not available for ${translation}, falling back to API download.`);
  }

  // Fallback: download chapter-by-chapter from online API
  done = 0;
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
          await sleep(300);
        } catch (err) {
          console.warn(`Failed: ${book.name} ${ch} (${translation}):`, err);
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