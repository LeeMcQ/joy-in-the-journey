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

/* ── IndexedDB chapter cache ──────────────────────────── */

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

/* ── Base URL (GitHub Pages safe) ────────────────────── */

function getBaseUrl(): string {
  const base = import.meta.env.BASE_URL ?? "/";
  return base.endsWith("/") ? base : `${base}/`;
}

/* ═══════════════════════════════════════════════════════
   IN-MEMORY FULL BIBLE CACHE
   ═══════════════════════════════════════════════════════
   Your JSON files use this exact shape:
     {
       "metadata": { ... },
       "verses": [
         { "book_name": "Genesis", "book": 1, "chapter": 1, "verse": 1, "text": "..." },
         ...
       ]
     }

   We load the whole file once (6MB) and keep it in memory.
   This means the first read costs one network round-trip;
   every subsequent chapter/verse lookup is instant.
 */

const fullBibleMemoryCache = new Map<TranslationId, LocalVerse[]>();

async function loadFullBibleIntoMemory(
  translation: TranslationId,
  signal?: AbortSignal,
): Promise<LocalVerse[] | null> {
  // Already loaded this session
  if (fullBibleMemoryCache.has(translation)) {
    return fullBibleMemoryCache.get(translation)!;
  }

  try {
    const url = `${getBaseUrl()}bibles/${translation.toLowerCase()}.json`;
    const res = await fetch(url, signal ? { signal } : undefined);
    if (!res.ok) return null;

    const data: any = await res.json();

    // ── Handle your actual shape: { metadata, verses: [...] } ──
    const rawVerses: any[] | null = Array.isArray(data)
      ? data           // bare array (just in case)
      : (data.verses ?? null); // ← YOUR actual shape

    if (!rawVerses || rawVerses.length === 0) return null;

    const verses: LocalVerse[] = rawVerses.map((v: any) => ({
      book: String(v.book_name ?? ""),
      chapter: Number(v.chapter),
      verse: Number(v.verse),
      text: String(v.text ?? "")
        .replace(/\[([^\]]*)\]/g, "$1")  // [word] → word  (KJV supplied words)
        .replace(/¶\s*/g, "")            // strip paragraph pilcrow marks
        .trim(),
    }));

    fullBibleMemoryCache.set(translation, verses);
    return verses;
  } catch {
    return null;
  }
}

/* ── Get one chapter from the in-memory Bible ─────────── */

async function fetchChapterFromLocalJson(
  bookName: string,
  chapter: number,
  translation: TranslationId,
): Promise<LocalVerse[] | null> {
  const all = await loadFullBibleIntoMemory(translation);
  if (!all) return null;

  const filtered = all.filter(
    (v) =>
      v.chapter === chapter &&
      v.book.toLowerCase() === bookName.toLowerCase(),
  );

  return filtered.length > 0 ? filtered : null;
}

/* ── Online API helpers ───────────────────────────────── */

interface ApiVerse { book_name: string; chapter: number; verse: number; text: string; }
interface ApiResponse { reference: string; verses: ApiVerse[]; text: string; }

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

const BIBLE_API_TRANSLATIONS = new Set<TranslationId>(["kjv", "web"]);

async function fetchFromApi(
  reference: string,
  translation: TranslationId,
  retries = 3,
): Promise<LocalVerse[]> {
  if (!BIBLE_API_TRANSLATIONS.has(translation)) {
    return fetchFromBolls(reference, translation, retries);
  }

  const url = `https://bible-api.com/${encodeURIComponent(reference)}?translation=${translation}`;

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
      // Last resort: try bible-api.com
      try {
        const res2 = await fetch(`https://bible-api.com/${encodeURIComponent(reference)}?translation=${translation}`);
        if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
        const d2: ApiResponse = await res2.json();
        return (d2.verses ?? []).map((v) => ({
          book: v.book_name, chapter: v.chapter, verse: v.verse, text: v.text.trim(),
        }));
      } catch {
        throw err;
      }
    }
  }
  throw new Error("Max retries reached");
}

/* ── Public: Get chapter ──────────────────────────────── */
/*
 * Priority:
 *   1. IndexedDB  (previously cached — instant, fully offline)
 *   2. Local JSON (public/bibles/<id>.json — offline after first load)
 *   3. Online API (bible-api.com / bolls.life — needs internet)
 */
export async function getChapter(
  bookName: string,
  chapter: number,
  translation: TranslationId = "kjv",
): Promise<VerseResult> {
  const key = cacheKey(translation, bookName, chapter);

  // 1. IDB
  const cached = await getFromCache(key);
  if (cached && cached.length > 0) {
    return { reference: `${bookName} ${chapter}`, translation, verses: cached, text: cached.map((v) => v.text).join(" ") };
  }

  // 2. Local JSON
  const local = await fetchChapterFromLocalJson(bookName, chapter, translation);
  if (local && local.length > 0) {
    await setInCache(key, local);
    return { reference: `${bookName} ${chapter}`, translation, verses: local, text: local.map((v) => v.text).join(" ") };
  }

  // 3. Online API
  try {
    const verses = await fetchFromApi(`${bookName} ${chapter}`, translation);
    if (verses.length > 0) await setInCache(key, verses);
    return { reference: `${bookName} ${chapter}`, translation, verses, text: verses.map((v) => v.text).join(" ") };
  } catch (err) {
    throw new Error(
      navigator.onLine
        ? `Failed to load ${bookName} ${chapter}: ${err}`
        : "You're offline. Download this Bible translation first, or connect to the internet.",
    );
  }
}

/* ── Public: Get verses ───────────────────────────────── */

export async function getVerses(
  bookName: string,
  chapter: number,
  verseStart: number,
  verseEnd?: number,
  translation: TranslationId = "kjv",
): Promise<VerseResult> {
  const end = verseEnd ?? verseStart;
  const refStr = verseEnd
    ? `${bookName} ${chapter}:${verseStart}-${verseEnd}`
    : `${bookName} ${chapter}:${verseStart}`;

  const chapterResult = await getChapter(bookName, chapter, translation);
  const filtered = chapterResult.verses.filter((v) => v.verse >= verseStart && v.verse <= end);

  return { reference: refStr, translation, verses: filtered, text: filtered.map((v) => v.text).join(" ") };
}

/* ── Public: Lookup by raw reference ──────────────────── */

export async function lookupReference(
  rawRef: string,
  translation: TranslationId = "kjv",
): Promise<VerseResult> {
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
 * Download and cache an entire Bible translation into IndexedDB.
 *
 * Your JSON shape: { metadata: {...}, verses: [{book_name, book, chapter, verse, text}] }
 *
 * Step 1: Fetch the full JSON from public/bibles/<id>.json (one fast request)
 * Step 2: Group verses by book+chapter and store each group in IndexedDB
 * Step 3: If JSON unavailable, fall back to chapter-by-chapter API (slow)
 */
export async function downloadTranslation(
  translation: TranslationId,
  onProgress: (p: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  onProgress({ total: TOTAL_CHAPTERS, done: 0, currentBook: "Loading Bible file…", status: "downloading" });

  // ── Try the local JSON file first ─────────────────────────────────
  const allVerses = await loadFullBibleIntoMemory(translation, signal);

  if (allVerses && allVerses.length > 0) {
    onProgress({ total: TOTAL_CHAPTERS, done: 0, currentBook: "Saving to device…", status: "downloading" });

    let done = 0;

    for (const book of BIBLE_BOOKS) {
      if (signal?.aborted) throw new Error("Cancelled");

      for (let ch = 1; ch <= book.chapters; ch++) {
        if (signal?.aborted) throw new Error("Cancelled");

        const key = cacheKey(translation, book.name, ch);
        const existing = await getFromCache(key);

        if (!existing || existing.length === 0) {
          const chapterVerses = allVerses.filter(
            (v) =>
              v.chapter === ch &&
              v.book.toLowerCase() === book.name.toLowerCase(),
          );
          if (chapterVerses.length > 0) {
            await setInCache(key, chapterVerses);
          }
        }

        done++;

        if (done % 10 === 0 || ch === book.chapters) {
          onProgress({ total: TOTAL_CHAPTERS, done, currentBook: book.name, status: "downloading" });
        }
      }
    }

    onProgress({ total: TOTAL_CHAPTERS, done: TOTAL_CHAPTERS, currentBook: "", status: "done" });
    return;
  }

  // ── Fallback: chapter-by-chapter from online API ───────────────────
  console.warn(`Local JSON unavailable for ${translation} — falling back to online API.`);

  let done = 0;
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
          console.warn(`Skipped ${book.name} ${ch} (${translation}):`, err);
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
        const count = keys.filter((k) => k.startsWith(`${translation}:`)).length;
        // Cap at TOTAL_CHAPTERS so the UI never shows > 100%
        resolve(Math.min(count, TOTAL_CHAPTERS));
      };
      req.onerror = () => resolve(0);
    });
  } catch { return 0; }
}

export function getBookList(): BibleBook[] { return BIBLE_BOOKS; }