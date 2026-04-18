#!/usr/bin/env node
/**
 * Joy in the Journey — Bible Pre-Download Script
 * 
 * Downloads KJV and WEB translations from bible-api.com and saves them
 * as JSON files in public/bibles/ so they can be served from GitHub Pages
 * and cached by the Service Worker for offline use.
 *
 * Usage:
 *   node scripts/download-bibles.js
 *   node scripts/download-bibles.js --translation kjv   (single translation)
 *   node scripts/download-bibles.js --force             (re-download all)
 *
 * The script:
 *  - Downloads 10 chapters at a time (batched parallel requests)
 *  - Resumes from where it left off if interrupted
 *  - Shows live progress (book name + percentage)
 *  - Saves to public/bibles/kjv.json and public/bibles/web.json
 *  - Each file is a single JSON: { "Genesis 1": [...verses], ... }
 *
 * After running, commit the files:
 *   git add public/bibles/
 *   git commit -m "Add offline Bible JSON files"
 *   git push
 */

import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "..", "public", "bibles");
const BATCH_SIZE = 10;
const RETRY_LIMIT = 3;
const RETRY_DELAY_MS = 1500;

// ── Colour output ──────────────────────────────────────────────────
const G = "\x1b[32m", Y = "\x1b[33m", R = "\x1b[31m", C = "\x1b[36m", RST = "\x1b[0m", B = "\x1b[1m";
const ok  = (m) => console.log(`${G}  ✅ ${m}${RST}`);
const inf = (m) => console.log(`${C}  ℹ  ${m}${RST}`);
const wrn = (m) => console.log(`${Y}  ⚠  ${m}${RST}`);
const err = (m) => console.error(`${R}  ✗  ${m}${RST}`);

// ── All 66 Bible books with chapter counts ─────────────────────────
const BIBLE_BOOKS = [
  { name: "Genesis",          id: "Genesis",          chapters: 50 },
  { name: "Exodus",           id: "Exodus",            chapters: 40 },
  { name: "Leviticus",        id: "Leviticus",         chapters: 27 },
  { name: "Numbers",          id: "Numbers",           chapters: 36 },
  { name: "Deuteronomy",      id: "Deuteronomy",       chapters: 34 },
  { name: "Joshua",           id: "Joshua",            chapters: 24 },
  { name: "Judges",           id: "Judges",            chapters: 21 },
  { name: "Ruth",             id: "Ruth",              chapters: 4  },
  { name: "1 Samuel",         id: "1+Samuel",          chapters: 31 },
  { name: "2 Samuel",         id: "2+Samuel",          chapters: 24 },
  { name: "1 Kings",          id: "1+Kings",           chapters: 22 },
  { name: "2 Kings",          id: "2+Kings",           chapters: 25 },
  { name: "1 Chronicles",     id: "1+Chronicles",      chapters: 29 },
  { name: "2 Chronicles",     id: "2+Chronicles",      chapters: 36 },
  { name: "Ezra",             id: "Ezra",              chapters: 10 },
  { name: "Nehemiah",         id: "Nehemiah",          chapters: 13 },
  { name: "Esther",           id: "Esther",            chapters: 10 },
  { name: "Job",              id: "Job",               chapters: 42 },
  { name: "Psalms",           id: "Psalms",            chapters: 150},
  { name: "Proverbs",         id: "Proverbs",          chapters: 31 },
  { name: "Ecclesiastes",     id: "Ecclesiastes",      chapters: 12 },
  { name: "Song of Solomon",  id: "Song+of+Solomon",   chapters: 8  },
  { name: "Isaiah",           id: "Isaiah",            chapters: 66 },
  { name: "Jeremiah",         id: "Jeremiah",          chapters: 52 },
  { name: "Lamentations",     id: "Lamentations",      chapters: 5  },
  { name: "Ezekiel",          id: "Ezekiel",           chapters: 48 },
  { name: "Daniel",           id: "Daniel",            chapters: 12 },
  { name: "Hosea",            id: "Hosea",             chapters: 14 },
  { name: "Joel",             id: "Joel",              chapters: 3  },
  { name: "Amos",             id: "Amos",              chapters: 9  },
  { name: "Obadiah",          id: "Obadiah",           chapters: 1  },
  { name: "Jonah",            id: "Jonah",             chapters: 4  },
  { name: "Micah",            id: "Micah",             chapters: 7  },
  { name: "Nahum",            id: "Nahum",             chapters: 3  },
  { name: "Habakkuk",         id: "Habakkuk",          chapters: 3  },
  { name: "Zephaniah",        id: "Zephaniah",         chapters: 3  },
  { name: "Haggai",           id: "Haggai",            chapters: 2  },
  { name: "Zechariah",        id: "Zechariah",         chapters: 14 },
  { name: "Malachi",          id: "Malachi",           chapters: 4  },
  { name: "Matthew",          id: "Matthew",           chapters: 28 },
  { name: "Mark",             id: "Mark",              chapters: 16 },
  { name: "Luke",             id: "Luke",              chapters: 24 },
  { name: "John",             id: "John",              chapters: 21 },
  { name: "Acts",             id: "Acts",              chapters: 28 },
  { name: "Romans",           id: "Romans",            chapters: 16 },
  { name: "1 Corinthians",    id: "1+Corinthians",     chapters: 16 },
  { name: "2 Corinthians",    id: "2+Corinthians",     chapters: 13 },
  { name: "Galatians",        id: "Galatians",         chapters: 6  },
  { name: "Ephesians",        id: "Ephesians",         chapters: 6  },
  { name: "Philippians",      id: "Philippians",       chapters: 4  },
  { name: "Colossians",       id: "Colossians",        chapters: 4  },
  { name: "1 Thessalonians",  id: "1+Thessalonians",   chapters: 5  },
  { name: "2 Thessalonians",  id: "2+Thessalonians",   chapters: 3  },
  { name: "1 Timothy",        id: "1+Timothy",         chapters: 6  },
  { name: "2 Timothy",        id: "2+Timothy",         chapters: 4  },
  { name: "Titus",            id: "Titus",             chapters: 3  },
  { name: "Philemon",         id: "Philemon",          chapters: 1  },
  { name: "Hebrews",          id: "Hebrews",           chapters: 13 },
  { name: "James",            id: "James",             chapters: 5  },
  { name: "1 Peter",          id: "1+Peter",           chapters: 5  },
  { name: "2 Peter",          id: "2+Peter",           chapters: 3  },
  { name: "1 John",           id: "1+John",            chapters: 5  },
  { name: "2 John",           id: "2+John",            chapters: 1  },
  { name: "3 John",           id: "3+John",            chapters: 1  },
  { name: "Jude",             id: "Jude",              chapters: 1  },
  { name: "Revelation",       id: "Revelation",        chapters: 22 },
];

const TOTAL_CHAPTERS = BIBLE_BOOKS.reduce((s, b) => s + b.chapters, 0);

// ── HTTP fetch with retry ──────────────────────────────────────────
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return httpsGet(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Invalid JSON from ${url}`)); }
      });
    }).on("error", reject).on("timeout", () => reject(new Error("Timeout")));
  });
}

async function fetchChapterWithRetry(bookId, chapter, translation, attempt = 1) {
  const url = `https://bible-api.com/${bookId}+${chapter}?translation=${translation}`;
  try {
    const data = await httpsGet(url);
    return data;
  } catch (e) {
    if (attempt >= RETRY_LIMIT) throw e;
    await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
    return fetchChapterWithRetry(bookId, chapter, translation, attempt + 1);
  }
}

// ── Progress bar ───────────────────────────────────────────────────
function renderProgress(done, total, bookName) {
  const pct = Math.round((done / total) * 100);
  const filled = Math.round((done / total) * 30);
  const bar = "█".repeat(filled) + "░".repeat(30 - filled);
  process.stdout.write(`\r  ${C}[${bar}]${RST} ${B}${pct}%${RST} — ${bookName.padEnd(20)} (${done}/${total})`);
}

// ── Main download function ─────────────────────────────────────────
async function downloadTranslation(translationId, translationLabel) {
  const outputPath = path.join(OUTPUT_DIR, `${translationId}.json`);
  const tempPath = outputPath + ".tmp";

  console.log(`\n${B}${C}Downloading ${translationLabel}...${RST}`);

  // Load existing partial data (resume support)
  let bibleData = {};
  if (fs.existsSync(tempPath)) {
    try {
      bibleData = JSON.parse(fs.readFileSync(tempPath, "utf-8"));
      const done = Object.keys(bibleData).length;
      inf(`Resuming from chapter ${done + 1}/${TOTAL_CHAPTERS}`);
    } catch {
      bibleData = {};
    }
  }

  // Build list of chapters to fetch (skip already done)
  const todo = [];
  for (const book of BIBLE_BOOKS) {
    for (let ch = 1; ch <= book.chapters; ch++) {
      const key = `${book.name} ${ch}`;
      if (!bibleData[key]) {
        todo.push({ book, ch, key });
      }
    }
  }

  if (todo.length === 0) {
    inf(`${translationLabel}: all chapters already downloaded`);
  } else {
    let done = TOTAL_CHAPTERS - todo.length;
    let errors = 0;

    for (let i = 0; i < todo.length; i += BATCH_SIZE) {
      const batch = todo.slice(i, i + BATCH_SIZE);
      const currentBook = batch[0].book.name;
      renderProgress(done, TOTAL_CHAPTERS, currentBook);

      const results = await Promise.allSettled(
        batch.map(({ book, ch }) =>
          fetchChapterWithRetry(book.id, ch, translationId)
        )
      );

      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        const { key } = batch[j];
        if (r.status === "fulfilled" && r.value?.verses) {
          bibleData[key] = r.value.verses.map(v => ({
            book: v.book_name,
            chapter: v.chapter,
            verse: v.verse,
            text: v.text.trim(),
          }));
        } else {
          errors++;
          // Leave key absent so it gets retried next run
        }
      }

      done += batch.length;

      // Save progress to temp file every 50 chapters
      if (done % 50 === 0 || i + BATCH_SIZE >= todo.length) {
        fs.writeFileSync(tempPath, JSON.stringify(bibleData, null, 0));
      }

      // Polite delay between batches
      await new Promise(r => setTimeout(r, 100));
    }

    renderProgress(TOTAL_CHAPTERS, TOTAL_CHAPTERS, "Complete!");
    console.log(); // newline after progress bar

    if (errors > 0) {
      wrn(`${errors} chapter(s) failed — run again to retry them`);
    }
  }

  // Move temp file to final location
  fs.writeFileSync(outputPath, JSON.stringify(bibleData, null, 0));
  if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

  const sizeKB = Math.round(fs.statSync(outputPath).size / 1024);
  ok(`${translationLabel} saved → public/bibles/${translationId}.json (${sizeKB} KB, ${Object.keys(bibleData).length} chapters)`);
  return Object.keys(bibleData).length;
}

// ── Entry point ────────────────────────────────────────────────────
async function main() {
  console.log(`\n${B}${C}Joy in the Journey — Bible Download Script${RST}`);
  console.log(`${C}Downloading all ${TOTAL_CHAPTERS} chapters for offline use...${RST}\n`);

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    ok("Created public/bibles/ directory");
  }

  const args = process.argv.slice(2);
  const singleTranslation = args.find((a, i) => args[i-1] === "--translation");
  const force = args.includes("--force");

  // Clear existing files if --force
  if (force) {
    ["kjv", "web"].forEach(t => {
      const f = path.join(OUTPUT_DIR, `${t}.json`);
      if (fs.existsSync(f)) { fs.unlinkSync(f); inf(`Cleared ${t}.json for re-download`); }
    });
  }

  const translations = singleTranslation
    ? [[singleTranslation, singleTranslation.toUpperCase()]]
    : [["kjv", "King James Version (KJV)"], ["web", "World English Bible (WEB)"]];

  let allOk = true;
  for (const [id, label] of translations) {
    try {
      await downloadTranslation(id, label);
    } catch (e) {
      err(`Failed to complete ${label}: ${e.message}`);
      allOk = false;
    }
  }

  if (allOk) {
    console.log(`\n${B}${G}✅ Bible files ready for offline use!${RST}`);
    console.log(`\nNext steps:`);
    console.log(`  ${C}git add public/bibles/${RST}`);
    console.log(`  ${C}git commit -m "Add offline Bible JSON files"${RST}`);
    console.log(`  ${C}git push${RST}`);
    console.log(`\nThe Service Worker will serve these from cache after first load.\n`);
  } else {
    console.log(`\n${Y}⚠  Some downloads failed. Run the script again to retry.${RST}\n`);
    process.exit(1);
  }
}

main().catch(e => { err(e.message); process.exit(1); });
