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

/* ================================================================== */
/*  Afrikaans book name translations (OAV 1933/53)                    */
/* ================================================================== */

export const AFR_BOOK_NAMES: Record<string, string> = {
  // Ou Testament
  "Genesis": "Genesis",
  "Exodus": "Eksodus",
  "Leviticus": "Levitikus",
  "Numbers": "Numeri",
  "Deuteronomy": "Deuteronomium",
  "Joshua": "Josua",
  "Judges": "Rigters",
  "Ruth": "Rut",
  "1 Samuel": "1 Samuel",
  "2 Samuel": "2 Samuel",
  "1 Kings": "1 Konings",
  "2 Kings": "2 Konings",
  "1 Chronicles": "1 Kronieke",
  "2 Chronicles": "2 Kronieke",
  "Ezra": "Esra",
  "Nehemiah": "Nehemia",
  "Esther": "Ester",
  "Job": "Job",
  "Psalms": "Psalms",
  "Proverbs": "Spreuke",
  "Ecclesiastes": "Prediker",
  "Song of Solomon": "Hooglied",
  "Isaiah": "Jesaja",
  "Jeremiah": "Jeremia",
  "Lamentations": "Klaagliedere",
  "Ezekiel": "Esegiël",
  "Daniel": "Daniël",
  "Hosea": "Hosea",
  "Joel": "Joël",
  "Amos": "Amos",
  "Obadiah": "Obadja",
  "Jonah": "Jona",
  "Micah": "Miga",
  "Nahum": "Nahum",
  "Habakkuk": "Habakuk",
  "Zephaniah": "Sefanja",
  "Haggai": "Haggai",
  "Zechariah": "Sagaria",
  "Malachi": "Maleagi",
  // Nuwe Testament
  "Matthew": "Matthéüs",
  "Mark": "Markus",
  "Luke": "Lukas",
  "John": "Johannes",
  "Acts": "Handelinge",
  "Romans": "Romeine",
  "1 Corinthians": "1 Korinthiërs",
  "2 Corinthians": "2 Korinthiërs",
  "Galatians": "Galásiërs",
  "Ephesians": "Efésiërs",
  "Philippians": "Filippense",
  "Colossians": "Kolossense",
  "1 Thessalonians": "1 Thessalonicense",
  "2 Thessalonians": "2 Thessalonicense",
  "1 Timothy": "1 Timótheüs",
  "2 Timothy": "2 Timótheüs",
  "Titus": "Titus",
  "Philemon": "Filémon",
  "Hebrews": "Hebreërs",
  "James": "Jakobus",
  "1 Peter": "1 Petrus",
  "2 Peter": "2 Petrus",
  "1 John": "1 Johannes",
  "2 John": "2 Johannes",
  "3 John": "3 Johannes",
  "Jude": "Judas",
  "Revelation": "Openbaring",
};

/** Return the display name for a book in the given translation language */
/* helpers updated below with XHO support */


/* ================================================================== */
/*  Xhosa (XHO75) book name translations                             */
/* ================================================================== */

export const XHO_BOOK_NAMES: Record<string, string> = {
  "Genesis": "Genesisi","Exodus": "Eksodus","Leviticus": "Levitikus",
  "Numbers": "Izibalelo","Deuteronomy": "Duteronomi","Joshua": "Yoshuwa",
  "Judges": "Abahluleli","Ruth": "Rute","1 Samuel": "1 Samuweli",
  "2 Samuel": "2 Samuweli","1 Kings": "1 Kumkani","2 Kings": "2 Kumkani",
  "1 Chronicles": "1 Izilandelo","2 Chronicles": "2 Izilandelo",
  "Ezra": "Ezra","Nehemiah": "Nehemiya","Esther": "Esti","Job": "Yobhi",
  "Psalms": "IiNdumiso","Proverbs": "IMizekeliso","Ecclesiastes": "UMthunyeli",
  "Song of Solomon": "Ingoma yezingoma","Isaiah": "Isaya","Jeremiah": "Yeremiya",
  "Lamentations": "IziLilo","Ezekiel": "Hezekile","Daniel": "Daniyeli",
  "Hosea": "Hoseya","Joel": "Yoweli","Amos": "Amosi","Obadiah": "Obadiya",
  "Jonah": "Yona","Micah": "Mika","Nahum": "Nahum","Habakkuk": "Habakuki",
  "Zephaniah": "Zefaniya","Haggai": "Hagayi","Zechariah": "Zakariya",
  "Malachi": "Malaki","Matthew": "Mateyu","Mark": "Marko","Luke": "Luka",
  "John": "Yohane","Acts": "IZenzo","Romans": "AmaRoma",
  "1 Corinthians": "1 AmaKorinte","2 Corinthians": "2 AmaKorinte",
  "Galatians": "AmaGalati","Ephesians": "AmaEfese","Philippians": "AmaFiliphi",
  "Colossians": "AmaKolose","1 Thessalonians": "1 AmaThesalonika",
  "2 Thessalonians": "2 AmaThesalonika","1 Timothy": "1 Timoti",
  "2 Timothy": "2 Timoti","Titus": "Tito","Philemon": "Filemon",
  "Hebrews": "AmaHebhere","James": "Yakobi","1 Peter": "1 Petros",
  "2 Peter": "2 Petros","1 John": "1 Yohane","2 John": "2 Yohane",
  "3 John": "3 Yohane","Jude": "Yuda","Revelation": "ISityhilelo",
};

export function getBookDisplayName(englishName: string, translation: string): string {
  if (translation === "afr") return AFR_BOOK_NAMES[englishName] ?? englishName;
  if (translation === "xho") return XHO_BOOK_NAMES[englishName] ?? englishName;
  return englishName;
}

export function getTestamentLabel(testament: "OT" | "NT", translation: string): string {
  if (translation === "afr") return testament === "OT" ? "Ou Testament" : "Nuwe Testament";
  if (translation === "xho") return testament === "OT" ? "Ufanelo Lwakudala" : "Ufanelo Olutsha";
  return testament === "OT" ? "Old Testament" : "New Testament";
}

export function getChaptersLabel(translation: string): string {
  if (translation === "afr") return "hoofstukke";
  if (translation === "xho") return "izahluko";
  return "chapters";
}

export const LOCALISED_TO_ENG: Record<string, string> = {
  ...Object.fromEntries(Object.entries(AFR_BOOK_NAMES).map(([en, af]) => [af.toLowerCase(), en])),
  ...Object.fromEntries(Object.entries(XHO_BOOK_NAMES).map(([en, xh]) => [xh.toLowerCase(), en])),
};
