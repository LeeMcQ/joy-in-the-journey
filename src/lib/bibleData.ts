/* ================================================================== */
/*  Bible canon metadata                                              */
/* ================================================================== */

export interface BibleBook {
  name: string;
  abbrev: string;
  chapters: number;
  testament: "OT" | "NT";
}

export const BIBLE_BOOKS: BibleBook[] = [
  // ── Old Testament ─────────────────────────────────────
  { name: "Genesis", abbrev: "Gen", chapters: 50, testament: "OT" },
  { name: "Exodus", abbrev: "Exod", chapters: 40, testament: "OT" },
  { name: "Leviticus", abbrev: "Lev", chapters: 27, testament: "OT" },
  { name: "Numbers", abbrev: "Num", chapters: 36, testament: "OT" },
  { name: "Deuteronomy", abbrev: "Deut", chapters: 34, testament: "OT" },
  { name: "Joshua", abbrev: "Josh", chapters: 24, testament: "OT" },
  { name: "Judges", abbrev: "Judg", chapters: 21, testament: "OT" },
  { name: "Ruth", abbrev: "Ruth", chapters: 4, testament: "OT" },
  { name: "1 Samuel", abbrev: "1Sam", chapters: 31, testament: "OT" },
  { name: "2 Samuel", abbrev: "2Sam", chapters: 24, testament: "OT" },
  { name: "1 Kings", abbrev: "1Kgs", chapters: 22, testament: "OT" },
  { name: "2 Kings", abbrev: "2Kgs", chapters: 25, testament: "OT" },
  { name: "1 Chronicles", abbrev: "1Chr", chapters: 29, testament: "OT" },
  { name: "2 Chronicles", abbrev: "2Chr", chapters: 36, testament: "OT" },
  { name: "Ezra", abbrev: "Ezra", chapters: 10, testament: "OT" },
  { name: "Nehemiah", abbrev: "Neh", chapters: 13, testament: "OT" },
  { name: "Esther", abbrev: "Esth", chapters: 10, testament: "OT" },
  { name: "Job", abbrev: "Job", chapters: 42, testament: "OT" },
  { name: "Psalms", abbrev: "Ps", chapters: 150, testament: "OT" },
  { name: "Proverbs", abbrev: "Prov", chapters: 31, testament: "OT" },
  { name: "Ecclesiastes", abbrev: "Eccl", chapters: 12, testament: "OT" },
  { name: "Song of Solomon", abbrev: "Song", chapters: 8, testament: "OT" },
  { name: "Isaiah", abbrev: "Isa", chapters: 66, testament: "OT" },
  { name: "Jeremiah", abbrev: "Jer", chapters: 52, testament: "OT" },
  { name: "Lamentations", abbrev: "Lam", chapters: 5, testament: "OT" },
  { name: "Ezekiel", abbrev: "Ezek", chapters: 48, testament: "OT" },
  { name: "Daniel", abbrev: "Dan", chapters: 12, testament: "OT" },
  { name: "Hosea", abbrev: "Hos", chapters: 14, testament: "OT" },
  { name: "Joel", abbrev: "Joel", chapters: 3, testament: "OT" },
  { name: "Amos", abbrev: "Amos", chapters: 9, testament: "OT" },
  { name: "Obadiah", abbrev: "Obad", chapters: 1, testament: "OT" },
  { name: "Jonah", abbrev: "Jonah", chapters: 4, testament: "OT" },
  { name: "Micah", abbrev: "Mic", chapters: 7, testament: "OT" },
  { name: "Nahum", abbrev: "Nah", chapters: 3, testament: "OT" },
  { name: "Habakkuk", abbrev: "Hab", chapters: 3, testament: "OT" },
  { name: "Zephaniah", abbrev: "Zeph", chapters: 3, testament: "OT" },
  { name: "Haggai", abbrev: "Hag", chapters: 2, testament: "OT" },
  { name: "Zechariah", abbrev: "Zech", chapters: 14, testament: "OT" },
  { name: "Malachi", abbrev: "Mal", chapters: 4, testament: "OT" },
  // ── New Testament ─────────────────────────────────────
  { name: "Matthew", abbrev: "Matt", chapters: 28, testament: "NT" },
  { name: "Mark", abbrev: "Mark", chapters: 16, testament: "NT" },
  { name: "Luke", abbrev: "Luke", chapters: 24, testament: "NT" },
  { name: "John", abbrev: "John", chapters: 21, testament: "NT" },
  { name: "Acts", abbrev: "Acts", chapters: 28, testament: "NT" },
  { name: "Romans", abbrev: "Rom", chapters: 16, testament: "NT" },
  { name: "1 Corinthians", abbrev: "1Cor", chapters: 16, testament: "NT" },
  { name: "2 Corinthians", abbrev: "2Cor", chapters: 13, testament: "NT" },
  { name: "Galatians", abbrev: "Gal", chapters: 6, testament: "NT" },
  { name: "Ephesians", abbrev: "Eph", chapters: 6, testament: "NT" },
  { name: "Philippians", abbrev: "Phil", chapters: 4, testament: "NT" },
  { name: "Colossians", abbrev: "Col", chapters: 4, testament: "NT" },
  { name: "1 Thessalonians", abbrev: "1Thess", chapters: 5, testament: "NT" },
  { name: "2 Thessalonians", abbrev: "2Thess", chapters: 3, testament: "NT" },
  { name: "1 Timothy", abbrev: "1Tim", chapters: 6, testament: "NT" },
  { name: "2 Timothy", abbrev: "2Tim", chapters: 4, testament: "NT" },
  { name: "Titus", abbrev: "Titus", chapters: 3, testament: "NT" },
  { name: "Philemon", abbrev: "Phlm", chapters: 1, testament: "NT" },
  { name: "Hebrews", abbrev: "Heb", chapters: 13, testament: "NT" },
  { name: "James", abbrev: "Jas", chapters: 5, testament: "NT" },
  { name: "1 Peter", abbrev: "1Pet", chapters: 5, testament: "NT" },
  { name: "2 Peter", abbrev: "2Pet", chapters: 3, testament: "NT" },
  { name: "1 John", abbrev: "1John", chapters: 5, testament: "NT" },
  { name: "2 John", abbrev: "2John", chapters: 1, testament: "NT" },
  { name: "3 John", abbrev: "3John", chapters: 1, testament: "NT" },
  { name: "Jude", abbrev: "Jude", chapters: 1, testament: "NT" },
  { name: "Revelation", abbrev: "Rev", chapters: 22, testament: "NT" },
];

export const OT_BOOKS = BIBLE_BOOKS.filter((b) => b.testament === "OT");
export const NT_BOOKS = BIBLE_BOOKS.filter((b) => b.testament === "NT");

/** Find a book by name, abbreviation, or common alias */
export function findBook(query: string): BibleBook | undefined {
  const q = query.trim().toLowerCase().replace(/\.$/, "");
  return BIBLE_BOOKS.find(
    (b) =>
      b.name.toLowerCase() === q ||
      b.abbrev.toLowerCase() === q ||
      b.name.toLowerCase().startsWith(q),
  );
}

/* ================================================================== */
/*  Reference parser — turns "John 3:16" into structured data         */
/* ================================================================== */

export interface ParsedRef {
  book: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
}

/**
 * Parse a raw reference string like "John 3:16-18" or "1 Cor. 2:14"
 * into structured parts. Handles the most common formats.
 */
export function parseReference(raw: string): ParsedRef | null {
  // Trim and normalise
  const s = raw.trim().replace(/\s+/g, " ");

  // Match: "Book Chapter:VerseStart-VerseEnd" or "Book Chapter:Verse" or "Book Chapter"
  const m = s.match(
    /^(\d?\s*[A-Za-z][A-Za-z .]+?)\s+(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?$/,
  );
  if (!m) return null;

  const bookRaw = m[1].trim();
  const chapter = parseInt(m[2], 10);
  const verseStart = m[3] ? parseInt(m[3], 10) : undefined;
  const verseEnd = m[4] ? parseInt(m[4], 10) : undefined;

  // Resolve book name
  const book = findBook(bookRaw);
  if (!book) return { book: bookRaw, chapter, verseStart, verseEnd };

  return { book: book.name, chapter, verseStart, verseEnd };
}

/** Build an API-friendly query string from a ParsedRef */
export function refToQuery(ref: ParsedRef): string {
  let q = `${ref.book} ${ref.chapter}`;
  if (ref.verseStart != null) {
    q += `:${ref.verseStart}`;
    if (ref.verseEnd != null) q += `-${ref.verseEnd}`;
  }
  return q;
}
