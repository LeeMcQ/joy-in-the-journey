// ============================================================
// Joy in the Journey Bible Study Series — PWA Data Layer Types
// ============================================================

/** A single Bible verse or verse range reference */
export interface VerseReference {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
}

/** Parsed scripture citation (may contain multiple references) */
export interface ScriptureRef {
  raw: string; // e.g. "John 16:13; 1 Cor. 2:14"
  refs: VerseReference[];
}

/** A highlighted or emphasised phrase within study content */
export interface Highlight {
  text: string;
  style: "bold" | "underline" | "italic" | "allCaps";
}

/** A note/commentary block that follows a question */
export interface Note {
  text: string;
  highlights?: Highlight[];
  sourceQuote?: {
    text: string;
    attribution: string; // e.g. "Steps to Christ p.24"
  };
}

/** A single numbered question in a study */
export interface Question {
  number: number;
  text: string;
  scripture: ScriptureRef;
  subParts?: string[]; // e.g. "a.", "b." sub-questions
  note?: Note;
}

/** A special content section (not a numbered question) */
export interface ContentSection {
  type:
    | "introduction"
    | "quote"
    | "illustration"
    | "heading"
    | "readDirective"
    | "principle"
    | "conclusion"
    | "list"
    | "custom";
  title?: string;
  text: string;
  attribution?: string;
  highlights?: Highlight[];
  items?: string[]; // for lists / principle sets
}

/** Position metadata for rendering order */
export type StudyElement =
  | { kind: "question"; data: Question }
  | { kind: "section"; data: ContentSection };

/** Top-level study object */
export interface Study {
  id: number;
  number: number; // study number as printed (1-28)
  title: string;
  subtitle?: string;
  seriesName: string;
  introduction: string; // intro paragraph(s) before Q1
  elements: StudyElement[]; // ordered list of questions & sections
  conclusion?: string;
  pageCount: number;
}

/** User progress tracking per study */
export interface StudyProgress {
  studyId: number;
  started: boolean;
  completed: boolean;
  completedAt?: string; // ISO date
  answeredQuestions: Record<number, string>; // questionNumber → user answer
  bookmarked: boolean;
  lastAccessedAt?: string; // ISO date
  notes?: string; // free-form user notes
  highlights: UserHighlight[];
}

/** Highlight colour presets */
export type HighlightColor = "gold" | "blue" | "green" | "pink";

/** A user-created text highlight within a study */
export interface UserHighlight {
  id: string;
  /** The highlighted text (snapshot) */
  text: string;
  /** Colour of the highlight */
  color: HighlightColor;
  /** Where it came from */
  context: HighlightContext;
  /** When it was created */
  createdAt: string; // ISO date
}

export type HighlightContext =
  | { type: "question"; questionNumber: number }
  | { type: "note"; questionNumber: number }
  | { type: "section"; sectionIndex: number }
  | { type: "introduction" };

/** Font family options (like Adventech) */
export type FontFamily = "sans" | "serif" | "mono";

/** App-level settings */
export interface AppSettings {
  fontSize: number; // 12–24 px (continuous slider)
  fontFamily: FontFamily;
  theme: "light" | "dark" | "sepia";
  bibleVersion: string;
  notificationsEnabled: boolean;
  currentStudyId: number | null;
}

/** Study plan configuration */
export type StudyPace = "28days" | "28weeks" | "1year" | "custom";

export interface StudyPlan {
  /** Has the user completed onboarding? */
  configured: boolean;
  pace: StudyPace;
  /** Custom number of days (only used when pace === "custom") */
  customDays?: number;
  /** ISO date when the plan started */
  startDate: string;
  /** Reminder enabled */
  reminderEnabled: boolean;
  /** Reminder time in 24h format "HH:MM" */
  reminderTime: string;
}

/** Complete app state */
export interface AppState {
  studies: Study[];
  progress: Record<number, StudyProgress>;
  settings: AppSettings;
  studyPlan: StudyPlan;
}
