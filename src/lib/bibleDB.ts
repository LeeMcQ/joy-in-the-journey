/* ================================================================== */
/*  Offline Bible engine (IndexedDB)                                  */
/*  Manages offline Bible translations stored in IndexedDB.          */
/*  Current translations: XHO75 (isiXhosa)                          */
/*  On install: imports the nested JSON into the "verses" store.     */
/*  Search scans the installed verses (see searchBible) — the old    */
/*  per-word "fts" store (~410k rows, >100 MB) is no longer built.   */
/* ================================================================== */

export interface BibleTranslation {
  id: string;
  language: string;
  languageCode: string;
  fullName: string;
  available: boolean;
  note?: string;
  jsonPath: string;
  /** Bump when the shipped data file changes so stale installs re-download. */
  dataVersion: number;
}

export interface BibleVerse {
  id: number;
  translation: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface SearchResult extends BibleVerse {
  snippet: string;
  score: number;
}

export const TRANSLATIONS: BibleTranslation[] = [
  {
    id: "XHO75",
    language: "isiXhosa",
    languageCode: "xh",
    fullName: "IBhayibhile 1975 (Xhosa)",
    available: true,
    jsonPath: "/bibles/xhosa/xho75.json",
    dataVersion: 2,
  },
];

/* ── IndexedDB setup ─────────────────────────────────── */

const DB_NAME  = "joy-bible-db";
const DB_VER   = 1;
const S_VERSES = "verses";
const S_FTS    = "fts";
const S_META   = "meta";

/** One shared connection (previously a new, never-closed one per call). */
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(S_VERSES)) {
        const vs = db.createObjectStore(S_VERSES, { keyPath: "id", autoIncrement: true });
        vs.createIndex("by_translation",  "translation",                        { unique: false });
        vs.createIndex("by_book_chapter", ["translation", "book", "chapter"],   { unique: false });
        vs.createIndex("by_reference",    ["translation", "book", "chapter", "verse"], { unique: true });
      }

      if (!db.objectStoreNames.contains(S_FTS)) {
        const fts = db.createObjectStore(S_FTS, { keyPath: "id", autoIncrement: true });
        fts.createIndex("by_word_translation", ["word", "translation"], { unique: false });
        fts.createIndex("by_verse_id",          "verseId",              { unique: false });
      }

      if (!db.objectStoreNames.contains(S_META)) {
        db.createObjectStore(S_META);
      }
    };

    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); dbPromise = null; };
      db.onclose = () => { dbPromise = null; };
      resolve(db);
      void purgeLegacyFts(db);
    };
    req.onerror  = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

/**
 * Older builds filled the "fts" store with one row per (word, verse) —
 * ~410k rows and well over 100 MB for the Xhosa Bible. Nothing reads it any
 * more, so empty it once to give that storage back on existing installs.
 */
async function purgeLegacyFts(db: IDBDatabase): Promise<void> {
  try {
    if (!db.objectStoreNames.contains(S_FTS)) return;
    const done = await new Promise<boolean>((resolve) => {
      const req = db.transaction(S_META, "readonly").objectStore(S_META).get("ftsPurged");
      req.onsuccess = () => resolve(req.result === true);
      req.onerror   = () => resolve(false);
    });
    if (done) return;
    await new Promise<void>((resolve) => {
      const tx = db.transaction([S_FTS, S_META], "readwrite");
      tx.objectStore(S_FTS).clear();
      tx.objectStore(S_META).put(true, "ftsPurged");
      tx.oncomplete = () => resolve();
      tx.onerror    = () => resolve();
      tx.onabort    = () => resolve();
    });
  } catch { /* non-fatal */ }
}

/* ── Meta helpers ────────────────────────────────────── */

async function getMeta(key: string): Promise<unknown> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx  = db.transaction(S_META, "readonly");
    const req = tx.objectStore(S_META).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror   = () => resolve(null);
  });
}

async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(S_META, "readwrite");
    tx.objectStore(S_META).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => resolve();
  });
}

/* ── Install state ───────────────────────────────────── */

export async function getInstalledTranslations(): Promise<string[]> {
  const v = await getMeta("installedTranslations");
  return Array.isArray(v) ? (v as string[]) : [];
}

export async function isTranslationInstalled(id: string): Promise<boolean> {
  if (!(await getInstalledTranslations()).includes(id)) return false;
  // Treat an out-of-date data file as "not installed" so users who installed an
  // older, incomplete version automatically re-download the corrected one.
  const meta = TRANSLATIONS.find((t) => t.id === id);
  if (!meta) return true;
  const storedVersion = Number(await getMeta(`dataVersion:${id}`)) || 1;
  return storedVersion >= meta.dataVersion;
}

async function markInstalled(id: string): Promise<void> {
  const list = await getInstalledTranslations();
  const meta = TRANSLATIONS.find((t) => t.id === id);
  await setMeta(`dataVersion:${id}`, meta?.dataVersion ?? 1);
  if (!list.includes(id)) await setMeta("installedTranslations", [...list, id]);
}

/* ── JSON shape ──────────────────────────────────────── */

interface JsonBible {
  language: string;
  translation: string;
  available?: boolean;
  note?: string;
  books: Array<{
    name: string;
    chapters: Array<{
      chapter: number;
      verses: Array<{ verse: number; text: string }>;
    }>;
  }>;
}

/* ── Search normaliser ───────────────────────────────── */

function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ── Install progress type ───────────────────────────── */

export interface InstallProgress {
  phase: "fetching" | "importing" | "indexing" | "done" | "error";
  book?: string;
  done: number;
  total: number;
  error?: string;
}

/* ── Install a translation ───────────────────────────── */

/** Remove any existing verses (and the FTS index) for a translation. */
async function clearTranslationData(db: IDBDatabase, translationId: string): Promise<void> {
  await new Promise<void>((resolve) => {
    const tx    = db.transaction(S_VERSES, "readwrite");
    const index = tx.objectStore(S_VERSES).index("by_translation");
    const req   = index.openCursor(IDBKeyRange.only(translationId));
    req.onsuccess = () => {
      const cur = req.result;
      if (cur) { cur.delete(); cur.continue(); } else resolve();
    };
    req.onerror = () => resolve();
  });
  // Legacy FTS rows (single translation only) — clearing fully is safe.
  await new Promise<void>((resolve) => {
    const tx  = db.transaction(S_FTS, "readwrite");
    const req = tx.objectStore(S_FTS).clear();
    req.onsuccess = () => resolve();
    req.onerror   = () => resolve();
  });
}

export async function installTranslation(
  translationId: string,
  onProgress: (p: InstallProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  const meta = TRANSLATIONS.find((t) => t.id === translationId);
  if (!meta) throw new Error(`Unknown translation: ${translationId}`);
  if (!meta.available) throw new Error(meta.note ?? `${translationId} is not available.`);

  if (await isTranslationInstalled(translationId)) {
    onProgress({ phase: "done", done: 1, total: 1 });
    return;
  }

  // Phase 1: fetch JSON
  onProgress({ phase: "fetching", done: 0, total: 1 });
  const base = import.meta.env.BASE_URL ?? "/";
  const url  = `${base.endsWith("/") ? base.slice(0, -1) : base}${meta.jsonPath}`;

  const res = await fetch(url, signal ? { signal } : undefined);
  if (!res.ok) throw new Error(`Failed to fetch ${translationId}: HTTP ${res.status}`);

  const bible: JsonBible = await res.json();
  if (bible.available === false) throw new Error(bible.note ?? `${translationId} is not available.`);

  // Flatten to verse array, de-duplicating by reference.
  // The verses store has a UNIQUE index on [translation, book, chapter, verse].
  // Some source corpora repeat verses (e.g. a book appearing twice), and a
  // single duplicate would throw ConstraintError and abort the whole import —
  // which is exactly what stopped the Xhosa Bible from installing. Keep the
  // first occurrence of each reference.
  const seenRef = new Set<string>();
  const allVerses: Omit<BibleVerse, "id">[] = [];
  for (const book of bible.books) {
    for (const chapter of book.chapters) {
      for (const v of chapter.verses) {
        const ref = `${book.name}|${chapter.chapter}|${v.verse}`;
        if (seenRef.has(ref)) continue;
        seenRef.add(ref);
        allVerses.push({
          translation: translationId,
          book: book.name,
          chapter: chapter.chapter,
          verse: v.verse,
          text: v.text,
        });
      }
    }
  }

  const total = allVerses.length;
  onProgress({ phase: "importing", done: 0, total });

  // Phase 2: batch-import verses
  const BATCH   = 500;
  const db      = await openDB();

  // Clear any leftovers from a previous partial/failed install so a retry
  // starts clean (otherwise old rows collide with the unique reference index).
  await clearTranslationData(db, translationId);

  for (let i = 0; i < allVerses.length; i += BATCH) {
    if (signal?.aborted) throw new Error("Cancelled");
    const batch = allVerses.slice(i, i + BATCH);

    await new Promise<void>((resolve, reject) => {
      const tx    = db.transaction(S_VERSES, "readwrite");
      const store = tx.objectStore(S_VERSES);
      batch.forEach((v) => store.add(v));
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });

    onProgress({
      phase: "importing",
      book: batch[batch.length - 1]?.book,
      done: Math.min(i + BATCH, total),
      total,
    });
  }

  await markInstalled(translationId);
  onProgress({ phase: "done", done: total, total });
}

/* ── Get chapter ─────────────────────────────────────── */

export async function getChapterFromDB(
  translationId: string,
  bookName: string,
  chapter: number,
): Promise<BibleVerse[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(S_VERSES, "readonly");
    const index = tx.objectStore(S_VERSES).index("by_book_chapter");
    const req   = index.getAll(IDBKeyRange.only([translationId, bookName, chapter]));
    req.onsuccess = () =>
      resolve((req.result as BibleVerse[]).sort((a, b) => a.verse - b.verse));
    req.onerror = () => reject(req.error);
  });
}

/* ── Get single verse ────────────────────────────────── */

export async function getVerseFromDB(
  translationId: string,
  bookName: string,
  chapter: number,
  verse: number,
): Promise<BibleVerse | null> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx    = db.transaction(S_VERSES, "readonly");
    const index = tx.objectStore(S_VERSES).index("by_reference");
    const req   = index.get(IDBKeyRange.only([translationId, bookName, chapter, verse]));
    req.onsuccess = () => resolve((req.result as BibleVerse) ?? null);
    req.onerror   = () => resolve(null);
  });
}

/* ── All verses of a translation (canonical order) ───── */

export async function getAllVersesFromDB(translationId: string): Promise<BibleVerse[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(S_VERSES, "readonly");
    const index = tx.objectStore(S_VERSES).index("by_translation");
    // Same-key entries come back in primary-key (= insertion = canonical) order.
    const req   = index.getAll(IDBKeyRange.only(translationId));
    req.onsuccess = () => resolve(req.result as BibleVerse[]);
    req.onerror   = () => reject(req.error);
  });
}

/* ── Text search ─────────────────────────────────────── */

/**
 * Substring search over installed verses: every query word must occur.
 * Substring (not whole-word/prefix) matching suits isiXhosa, where nouns
 * carry class prefixes — "thixo" finds "uThixo", "kaThixo", "nguThixo".
 */
export async function searchBible(
  query: string,
  translationIds: string[],
  maxResults = 30,
): Promise<SearchResult[]> {
  const terms = normalise(query).split(" ").filter((w) => w.length >= 2);
  if (!terms.length) return [];

  const out: SearchResult[] = [];
  for (const tid of translationIds) {
    for (const v of await getAllVersesFromDB(tid)) {
      const hay = normalise(v.text);
      if (!terms.every((t) => hay.includes(t))) continue;
      const first = v.text.toLowerCase().indexOf(terms[0]);
      const snippet = first >= 0
        ? `...${v.text.slice(Math.max(0, first - 20), first + terms[0].length + 40)}...`
        : v.text.slice(0, 80) + "...";
      out.push({ ...v, snippet, score: terms.length });
      if (out.length >= maxResults) return out;
    }
  }
  return out;
}

/* ── Uninstall ───────────────────────────────────────── */

export async function uninstallTranslation(translationId: string): Promise<void> {
  const db = await openDB();

  await new Promise<void>((resolve, reject) => {
    const tx    = db.transaction(S_VERSES, "readwrite");
    const index = tx.objectStore(S_VERSES).index("by_translation");
    const req   = index.openCursor(IDBKeyRange.only(translationId));
    req.onsuccess = () => {
      const cur = req.result;
      if (cur) { cur.delete(); cur.continue(); } else resolve();
    };
    req.onerror = () => reject(req.error);
  });

  await new Promise<void>((resolve, reject) => {
    const tx  = db.transaction(S_FTS, "readwrite");
    const req = tx.objectStore(S_FTS).clear();
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });

  const list = await getInstalledTranslations();
  await setMeta("installedTranslations", list.filter((t) => t !== translationId));
}

/* ── Storage estimate ────────────────────────────────── */

export async function getStorageEstimate(): Promise<{ used: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    return { used: usage ?? 0, quota: quota ?? 0 };
  } catch { return null; }
}
