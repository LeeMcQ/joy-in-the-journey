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

export type TranslationId = "afr" | "kjv" | "web" | "xho";

export interface TranslationInfo {
  id: TranslationId;
  name: string;
  fullName: string;
  downloadable: boolean;
  language: string;
  isDefault?: boolean;
}

export const LOCAL_TRANSLATIONS: TranslationInfo[] = [
  {
    id: "afr",
    name: "AFR",
    fullName: "Afrikaans Bybel 1933/53",
    downloadable: true,
    language: "af",
    isDefault: true,
  },
  {
    id: "kjv",
    name: "KJV",
    fullName: "King James Version",
    downloadable: true,
    language: "en",
  },
  {
    id: "web",
    name: "WEB",
    fullName: "World English Bible",
    downloadable: true,
    language: "en",
  },
  {
    id: "xho",
    name: "XHO",
    fullName: "IBhayibhile 1975 (Xhosa)",
    downloadable: true,
    language: "xh",
  },
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

/* ══════════════════════════════════════════════════════
   IN-MEMORY FULL BIBLE CACHE
   ══════════════════════════════════════════════════════
   JSON shape: { metadata, verses: [{book_name, book, chapter, verse, text}] }
   We load once per session and keep in memory for instant lookups.
*/

const fullBibleMemoryCache = new Map<TranslationId, LocalVerse[]>();

async function loadFullBibleIntoMemory(
  translation: TranslationId,
  signal?: AbortSignal,
): Promise<LocalVerse[] | null> {
  if (fullBibleMemoryCache.has(translation)) {
    return fullBibleMemoryCache.get(translation)!;
  }

  try {
    const url = `${getBaseUrl()}bibles/${translation.toLowerCase()}.json`;
    const res = await fetch(url, signal ? { signal } : undefined);
    if (!res.ok) return null;

    const data: any = await res.json();

    const rawVerses: any[] | null = Array.isArray(data)
      ? data
      : (data.verses ?? null);

    if (!rawVerses || rawVerses.length === 0) return null;

    const verses: LocalVerse[] = rawVerses.map((v: any) => ({
      book: String(v.book_name ?? ""),
      chapter: Number(v.chapter),
      verse: Number(v.verse),
      text: String(v.text ?? "")
        .replace(/\[([^\]]*)\]/g, "$1")
        .replace(/¶\s*/g, "")
        .trim(),
    }));

    fullBibleMemoryCache.set(translation, verses);
    return verses;
  } catch {
    return null;
  }
}

/* ── Get one chapter from in-memory Bible ─────────────── */

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

/* ── Auto-install: silently cache AFR on first load ─────
   Runs in the background after the app loads.
   Checks if AFR is already cached; if not, downloads and
   stores all 27,751 verses into IndexedDB silently.
*/

let autoInstallPromise: Promise<void> | null = null;

export async function autoInstallDefaultBible(): Promise<void> {
  if (autoInstallPromise) return autoInstallPromise;

  autoInstallPromise = (async () => {
    const cached = await getCachedChapterCount("afr");
    if (cached >= TOTAL_CHAPTERS) return; // already installed

    const allVerses = await loadFullBibleIntoMemory("afr");
    if (!allVerses) return;

    for (const book of BIBLE_BOOKS) {
      for (let ch = 1; ch <= book.chapters; ch++) {
        const key = cacheKey("afr", book.name, ch);
        const existing = await getFromCache(key);
        if (existing && existing.length > 0) continue;

        const chapterVerses = allVerses.filter(
          (v) =>
            v.chapter === ch &&
            v.book.toLowerCase() === book.name.toLowerCase(),
        );
        if (chapterVerses.length > 0) {
          await setInCache(key, chapterVerses);
        }
      }
    }
  })();

  return autoInstallPromise;
}

/* ── Online API fallback ──────────────────────────────── */

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
    throw new Error(`No online fallback for ${translation}. Please download it first.`);
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

/* ── Public: Get chapter ──────────────────────────────── */
/*
 * Priority:
 *   1. IndexedDB  (previously cached — instant, fully offline)
 *   2. Local JSON (public/bibles/<id>.json — offline after first load)
 *   3. Online API (bible-api.com — needs internet, KJV/WEB only)
 */
export async function getChapter(
  bookName: string,
  chapter: number,
  translation: TranslationId = "afr",
): Promise<VerseResult> {
  if (translation === "xho") {
    const { getChapterFromDB, isTranslationInstalled } = await import("@/lib/bibleDB");
    const installed = await isTranslationInstalled("XHO75");
    if (!installed) throw new Error("Xhosa Bible not installed. Download it in Settings → Bible Languages.");
    const rows = await getChapterFromDB("XHO75", bookName, chapter);
    if (!rows.length) throw new Error(`${bookName} ${chapter} not found in XHO75.`);
    const verses: LocalVerse[] = rows.map((v) => ({ book: v.book, chapter: v.chapter, verse: v.verse, text: v.text }));
    return { reference: `${bookName} ${chapter}`, translation, verses, text: verses.map((v) => v.text).join(" ") };
  }

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

  // 3. Online API (KJV/WEB only)
  try {
    const verses = await fetchFromApi(`${bookName} ${chapter}`, translation);
    if (verses.length > 0) await setInCache(key, verses);
    return { reference: `${bookName} ${chapter}`, translation, verses, text: verses.map((v) => v.text).join(" ") };
  } catch (err) {
    throw new Error(
      navigator.onLine
        ? `Failed to load ${bookName} ${chapter}: ${err}`
        : "Jy is vanlyn. Laai hierdie Bybelvertaling eers af, of koppel aan die internet.",
    );
  }
}

/* ── Public: Get verses ───────────────────────────────── */

export async function getVerses(
  bookName: string,
  chapter: number,
  verseStart: number,
  verseEnd?: number,
  translation: TranslationId = "afr",
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
  translation: TranslationId = "afr",
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

/* ── Public: Multi-translation lookup ─────────────────── */

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
  onProgress({ total: TOTAL_CHAPTERS, done: 0, currentBook: "Laai Bybellêer…", status: "downloading" });

  const allVerses = await loadFullBibleIntoMemory(translation, signal);

  if (allVerses && allVerses.length > 0) {
    onProgress({ total: TOTAL_CHAPTERS, done: 0, currentBook: "Stoor op toestel…", status: "downloading" });

    let done = 0;

    for (const book of BIBLE_BOOKS) {
      if (signal?.aborted) throw new Error("Gekanselleer");

      for (let ch = 1; ch <= book.chapters; ch++) {
        if (signal?.aborted) throw new Error("Gekanselleer");

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

  // Fallback: online API for KJV/WEB
  console.warn(`Local JSON unavailable for ${translation} — falling back to online API.`);

  let done = 0;
  for (const book of BIBLE_BOOKS) {
    if (signal?.aborted) throw new Error("Gekanselleer");
    onProgress({ total: TOTAL_CHAPTERS, done, currentBook: book.name, status: "downloading" });

    for (let ch = 1; ch <= book.chapters; ch++) {
      if (signal?.aborted) throw new Error("Gekanselleer");

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
        resolve(Math.min(count, TOTAL_CHAPTERS));
      };
      req.onerror = () => resolve(0);
    });
  } catch { return 0; }
}

export function getBookList(): BibleBook[] { return BIBLE_BOOKS; }
