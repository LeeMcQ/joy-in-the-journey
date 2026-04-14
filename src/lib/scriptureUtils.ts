/**
 * Scripture reference splitter and normaliser.
 *
 * Handles: "John 16:13; 1 Cor. 2:14"  → ["John 16:13", "1 Cor. 2:14"]
 *          "1 Thess. 4:15, 16; 1 Cor. 15:51-54; Acts 13:36"
 *          "1 Corinthians 6:19, 20; 10:31"  → keeps "6:19, 20" together, splits "10:31"
 *          "2 Thess. 2:9; Matt. 24:23-27; 1 Tim. 4:1; Rev. 16:14"
 */

/** Pattern that looks like the start of a book name */
const BOOK_START = /^[1-3]?\s*[A-Z][a-z]/;

/**
 * Split a raw scripture string into individual references.
 * Semicolons always split. Commas split only when followed by a book name.
 */
export function splitReferences(raw: string): string[] {
  if (!raw) return [];

  // First split on semicolons — these are always separate references
  const semiParts = raw.split(/\s*;\s*/);

  const results: string[] = [];

  for (const part of semiParts) {
    // Now handle commas within each semi-part
    // "1 Corinthians 6:19, 20" — comma separates verses (keep together)
    // "1 Cor. 2:14, Romans 8:7" — comma separates books (split)
    const commaParts = part.split(/\s*,\s*/);

    if (commaParts.length <= 1) {
      results.push(part.trim());
      continue;
    }

    // Walk comma parts: if a part starts with a book name, it's a new reference
    let current = commaParts[0];
    for (let i = 1; i < commaParts.length; i++) {
      const p = commaParts[i].trim();
      if (BOOK_START.test(p)) {
        // This is a new book reference
        results.push(current.trim());
        current = p;
      } else {
        // This is a verse continuation (e.g. "19, 20" or "15:51-54")
        current += ", " + p;
      }
    }
    results.push(current.trim());
  }

  return results.filter(Boolean);
}

/**
 * Common abbreviation → full book name mapping for bible-api.com
 */
const ABBREV_MAP: Record<string, string> = {
  "gen": "Genesis", "exod": "Exodus", "lev": "Leviticus", "num": "Numbers",
  "deut": "Deuteronomy", "josh": "Joshua", "judg": "Judges",
  "1 sam": "1 Samuel", "2 sam": "2 Samuel", "1 kgs": "1 Kings", "2 kgs": "2 Kings",
  "1 kings": "1 Kings", "2 kings": "2 Kings",
  "1 chr": "1 Chronicles", "2 chr": "2 Chronicles",
  "1 chron": "1 Chronicles", "2 chron": "2 Chronicles",
  "neh": "Nehemiah", "esth": "Esther",
  "ps": "Psalms", "psa": "Psalms", "psalm": "Psalms",
  "prov": "Proverbs", "eccl": "Ecclesiastes", "eccles": "Ecclesiastes",
  "song": "Song of Solomon", "isa": "Isaiah", "jer": "Jeremiah",
  "lam": "Lamentations", "ezek": "Ezekiel", "dan": "Daniel",
  "hos": "Hosea", "obad": "Obadiah", "mic": "Micah",
  "nah": "Nahum", "hab": "Habakkuk", "zeph": "Zephaniah",
  "hag": "Haggai", "zech": "Zechariah", "mal": "Malachi",
  "matt": "Matthew", "mk": "Mark",
  "rom": "Romans",
  "1 cor": "1 Corinthians", "2 cor": "2 Corinthians",
  "1 corinthians": "1 Corinthians", "2 corinthians": "2 Corinthians",
  "gal": "Galatians", "eph": "Ephesians", "phil": "Philippians",
  "col": "Colossians",
  "1 thess": "1 Thessalonians", "2 thess": "2 Thessalonians",
  "1 tim": "1 Timothy", "2 tim": "2 Timothy",
  "tit": "Titus", "phlm": "Philemon", "heb": "Hebrews",
  "jas": "James", "1 pet": "1 Peter", "2 pet": "2 Peter",
  "1 jn": "1 John", "2 jn": "2 John", "3 jn": "3 John",
  "1 john": "1 John", "2 john": "2 John", "3 john": "3 John",
  "rev": "Revelation",
};

/**
 * Normalise a single reference for the API.
 * "1 Cor. 2:14" → "1 Corinthians 2:14"
 * "Matt.24:12"  → "Matthew 24:12"
 */
export function normaliseReference(ref: string): string {
  let s = ref.trim();

  // Fix missing space after period: "Matt.24" → "Matt. 24"
  s = s.replace(/\.(\d)/, ". $1");

  // Extract the book part (everything before the first digit that looks like chapter)
  const m = s.match(/^(.+?)\s*(\d+.*)$/);
  if (!m) return s;

  let bookPart = m[1].trim().replace(/\.$/, "").toLowerCase();
  const versePart = m[2];

  // Try exact match first, then prefix match
  const resolved =
    ABBREV_MAP[bookPart] ??
    Object.entries(ABBREV_MAP).find(([k]) => k.startsWith(bookPart))?.[1];

  if (resolved) {
    return `${resolved} ${versePart}`;
  }

  // Return original with cleaned-up formatting
  return `${m[1].trim()} ${versePart}`;
}
