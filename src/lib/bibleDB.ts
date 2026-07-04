/* ================================================================== */
/*  Bible SQLite Engine                                               */
/*  Manages offline Bible translations stored in IndexedDB.          */
/*  Current translations: XHO75 (isiXhosa)                          */
/*  On first install: imports JSON, creates indexes, enables FTS.    */
/* ================================================================== */

export interface BibleTranslation {
  id: string;
  language: string;
  languageCode: string;
  fullName: string;
  available: boolean;
  note?: string;
  jsonPath: string;
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
  },
];

/* ── IndexedDB setup ─────────────────────────────────── */

const DB_NAME  = "joy-bible-db";
const DB_VER   = 1;
const S_VERSES = "verses";
const S_FTS    = "fts";
const S_META   = "meta";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
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

    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
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
  return (await getInstalledTranslations()).includes(id);
}

async function markInstalled(id: string): Promise<void> {
  const list = await getInstalledTranslations();
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

/* ── Tokeniser ───────────────────────────────────────── */

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
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
  // FTS store currently holds a single translation; clearing it fully is safe.
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

  const verseIds: number[] = [];

  for (let i = 0; i < allVerses.length; i += BATCH) {
    if (signal?.aborted) throw new Error("Cancelled");
    const batch = allVerses.slice(i, i + BATCH);

    await new Promise<void>((resolve, reject) => {
      const tx    = db.transaction(S_VERSES, "readwrite");
      const store = tx.objectStore(S_VERSES);
      batch.forEach((v) => {
        const req = store.add(v);
        req.onsuccess = () => verseIds.push(req.result as number);
      });
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

  // Phase 3: build FTS index
  const ftsEntries: { word: string; translation: string; verseId: number }[] = [];
  allVerses.forEach((v, idx) => {
    const words = [...new Set(tokenise(v.text))];
    words.forEach((word) =>
      ftsEntries.push({ word, translation: translationId, verseId: verseIds[idx] ?? idx + 1 })
    );
  });

  onProgress({ phase: "indexing", done: 0, total: ftsEntries.length });

  const FTS_BATCH = 2500;
  for (let i = 0; i < ftsEntries.length; i += FTS_BATCH) {
    if (signal?.aborted) throw new Error("Cancelled");
    const batch = ftsEntries.slice(i, i + FTS_BATCH);

    await new Promise<void>((resolve, reject) => {
      const tx    = db.transaction(S_FTS, "readwrite");
      const store = tx.objectStore(S_FTS);
      batch.forEach((e) => store.add(e));
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });

    onProgress({ phase: "indexing", done: Math.min(i + FTS_BATCH, ftsEntries.length), total: ftsEntries.length });
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

/* ── Full-text search ────────────────────────────────── */

export async function searchBible(
  query: string,
  translationIds: string[],
  maxResults = 30,
): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const db         = await openDB();
  const queryWords = tokenise(query);
  if (!queryWords.length) return [];

  const wordResults: Map<number, number>[] = [];

  for (const word of queryWords) {
    const hits = new Map<number, number>();
    for (const tid of translationIds) {
      const ids = await new Promise<number[]>((resolve) => {
        const tx    = db.transaction(S_FTS, "readonly");
        const index = tx.objectStore(S_FTS).index("by_word_translation");
        const range = IDBKeyRange.bound([word, tid], [word + "\uffff", tid]);
        const req   = index.getAll(range);
        req.onsuccess = () =>
          resolve((req.result as { verseId: number }[]).map((r) => r.verseId));
        req.onerror = () => resolve([]);
      });
      ids.forEach((id) => hits.set(id, (hits.get(id) ?? 0) + 1));
    }
    wordResults.push(hits);
  }

  let candidates = new Set(wordResults[0]?.keys() ?? []);
  for (let i = 1; i < wordResults.length; i++) {
    candidates = new Set([...candidates].filter((id) => wordResults[i].has(id)));
  }

  const scored = [...candidates]
    .map((id) => ({ id, score: wordResults.reduce((s, wr) => s + (wr.get(id) ?? 0), 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  if (!scored.length) return [];

  const verses = await new Promise<BibleVerse[]>((resolve) => {
    const tx    = db.transaction(S_VERSES, "readonly");
    const store = tx.objectStore(S_VERSES);
    const out: BibleVerse[] = [];
    let pending = scored.length;
    scored.forEach(({ id }) => {
      const req = store.get(id);
      req.onsuccess = () => { if (req.result) out.push(req.result as BibleVerse); if (!--pending) resolve(out); };
      req.onerror   = () => { if (!--pending) resolve(out); };
    });
  });

  const ql = queryWords.join(" ");
  return verses
    .map((v) => {
      const idx     = v.text.toLowerCase().indexOf(ql);
      const snippet = idx >= 0
        ? `...${v.text.slice(Math.max(0, idx - 20), idx + ql.length + 40)}...`
        : v.text.slice(0, 80) + "...";
      return { ...v, snippet, score: scored.find((s) => s.id === v.id)?.score ?? 0 };
    })
    .sort((a, b) => b.score - a.score);
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
