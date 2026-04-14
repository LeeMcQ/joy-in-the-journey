#!/usr/bin/env node
/**
 * Downloads complete KJV and WEB Bibles from bible-api.com
 * and saves them as compact JSON files for offline use.
 *
 * Usage:  node scripts/download-bibles.js
 * Output: public/bibles/kjv.json, public/bibles/web.json
 *
 * Takes ~5-10 minutes per translation (1,189 chapters total).
 * Run this ONCE, commit the JSON files, and they're bundled in the PWA.
 */

const fs = require("fs");
const path = require("path");

const BOOKS = [
  { name: "Genesis", chapters: 50 },
  { name: "Exodus", chapters: 40 },
  { name: "Leviticus", chapters: 27 },
  { name: "Numbers", chapters: 36 },
  { name: "Deuteronomy", chapters: 34 },
  { name: "Joshua", chapters: 24 },
  { name: "Judges", chapters: 21 },
  { name: "Ruth", chapters: 4 },
  { name: "1 Samuel", chapters: 31 },
  { name: "2 Samuel", chapters: 24 },
  { name: "1 Kings", chapters: 22 },
  { name: "2 Kings", chapters: 25 },
  { name: "1 Chronicles", chapters: 29 },
  { name: "2 Chronicles", chapters: 36 },
  { name: "Ezra", chapters: 10 },
  { name: "Nehemiah", chapters: 13 },
  { name: "Esther", chapters: 10 },
  { name: "Job", chapters: 42 },
  { name: "Psalms", chapters: 150 },
  { name: "Proverbs", chapters: 31 },
  { name: "Ecclesiastes", chapters: 12 },
  { name: "Song of Solomon", chapters: 8 },
  { name: "Isaiah", chapters: 66 },
  { name: "Jeremiah", chapters: 52 },
  { name: "Lamentations", chapters: 5 },
  { name: "Ezekiel", chapters: 48 },
  { name: "Daniel", chapters: 12 },
  { name: "Hosea", chapters: 14 },
  { name: "Joel", chapters: 3 },
  { name: "Amos", chapters: 9 },
  { name: "Obadiah", chapters: 1 },
  { name: "Jonah", chapters: 4 },
  { name: "Micah", chapters: 7 },
  { name: "Nahum", chapters: 3 },
  { name: "Habakkuk", chapters: 3 },
  { name: "Zephaniah", chapters: 3 },
  { name: "Haggai", chapters: 2 },
  { name: "Zechariah", chapters: 14 },
  { name: "Malachi", chapters: 4 },
  { name: "Matthew", chapters: 28 },
  { name: "Mark", chapters: 16 },
  { name: "Luke", chapters: 24 },
  { name: "John", chapters: 21 },
  { name: "Acts", chapters: 28 },
  { name: "Romans", chapters: 16 },
  { name: "1 Corinthians", chapters: 16 },
  { name: "2 Corinthians", chapters: 13 },
  { name: "Galatians", chapters: 6 },
  { name: "Ephesians", chapters: 6 },
  { name: "Philippians", chapters: 4 },
  { name: "Colossians", chapters: 4 },
  { name: "1 Thessalonians", chapters: 5 },
  { name: "2 Thessalonians", chapters: 3 },
  { name: "1 Timothy", chapters: 6 },
  { name: "2 Timothy", chapters: 4 },
  { name: "Titus", chapters: 3 },
  { name: "Philemon", chapters: 1 },
  { name: "Hebrews", chapters: 13 },
  { name: "James", chapters: 5 },
  { name: "1 Peter", chapters: 5 },
  { name: "2 Peter", chapters: 3 },
  { name: "1 John", chapters: 5 },
  { name: "2 John", chapters: 1 },
  { name: "3 John", chapters: 1 },
  { name: "Jude", chapters: 1 },
  { name: "Revelation", chapters: 22 },
];

const TOTAL_CHAPTERS = BOOKS.reduce((s, b) => s + b.chapters, 0); // 1189

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchChapter(book, chapter, translation) {
  const ref = encodeURIComponent(`${book} ${chapter}`);
  const url = `https://bible-api.com/${ref}?translation=${translation}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Return array of verse texts, sorted by verse number
      const verses = (data.verses || [])
        .sort((a, b) => a.verse - b.verse)
        .map((v) => v.text.trim());
      return verses;
    } catch (err) {
      console.error(`  Retry ${attempt + 1}/3 for ${book} ${chapter}: ${err.message}`);
      await sleep(2000 * (attempt + 1));
    }
  }
  console.error(`  FAILED: ${book} ${chapter} — using empty array`);
  return [];
}

async function downloadTranslation(translation) {
  console.log(`\n📖 Downloading ${translation.toUpperCase()}...`);
  const bible = { translation, books: [] };
  let done = 0;

  for (const bookMeta of BOOKS) {
    const bookData = { name: bookMeta.name, chapters: [] };
    console.log(`  ${bookMeta.name} (${bookMeta.chapters} chapters)`);

    for (let ch = 1; ch <= bookMeta.chapters; ch++) {
      const verses = await fetchChapter(bookMeta.name, ch, translation);
      bookData.chapters.push(verses);
      done++;

      // Rate limit: ~100ms between requests
      await sleep(100);

      // Progress
      if (ch % 10 === 0 || ch === bookMeta.chapters) {
        const pct = ((done / TOTAL_CHAPTERS) * 100).toFixed(1);
        process.stdout.write(`    ch ${ch}/${bookMeta.chapters} — ${pct}% total\r`);
      }
    }
    console.log();
    bible.books.push(bookData);
  }

  // Write to file
  const outDir = path.join(__dirname, "..", "public", "bibles");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${translation}.json`);
  fs.writeFileSync(outPath, JSON.stringify(bible));

  const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);
  console.log(`✅ Saved ${outPath} (${sizeMB} MB)`);
}

async function main() {
  console.log("=== Joy in the Journey — Bible Downloader ===");
  console.log(`Downloading ${TOTAL_CHAPTERS} chapters × 2 translations\n`);

  await downloadTranslation("kjv");
  await downloadTranslation("web");

  console.log("\n🎉 Done! Bible files saved to public/bibles/");
  console.log("Run 'npm run build' to bundle them into the PWA.");
}

main().catch(console.error);
