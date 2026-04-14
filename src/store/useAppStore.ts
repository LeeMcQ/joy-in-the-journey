import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Study,
  StudyProgress,
  AppSettings,
  UserHighlight,
  HighlightColor,
  HighlightContext,
  StudyPlan,
  StudyPace,
  FontFamily,
} from "@/data/types";
import studiesData from "@/data/studies.json";

/* ------------------------------------------------------------------ */
/*  State shape                                                       */
/* ------------------------------------------------------------------ */

interface AppStore {
  studies: Study[];
  progress: Record<number, StudyProgress>;
  settings: AppSettings;
  studyPlan: StudyPlan;

  // Study progress
  startStudy: (studyId: number) => void;
  completeStudy: (studyId: number) => void;
  uncompleteStudy: (studyId: number) => void;
  answerQuestion: (studyId: number, questionNum: number, answer: string) => void;
  clearAnswer: (studyId: number, questionNum: number) => void;
  toggleBookmark: (studyId: number) => void;
  setStudyNotes: (studyId: number, notes: string) => void;

  // Highlights
  addHighlight: (studyId: number, text: string, color: HighlightColor, context: HighlightContext) => void;
  removeHighlight: (studyId: number, highlightId: string) => void;
  getHighlights: (studyId: number) => UserHighlight[];
  getAllHighlights: () => { studyId: number; studyTitle: string; highlight: UserHighlight }[];

  // Settings
  setFontSize: (size: number) => void;
  setFontFamily: (family: FontFamily) => void;
  setTheme: (theme: AppSettings["theme"]) => void;
  setBibleVersion: (version: string) => void;
  setCurrentStudy: (id: number | null) => void;

  // Study plan
  setupPlan: (pace: StudyPace, customDays?: number) => void;
  setReminder: (enabled: boolean, time?: string) => void;
  getTodayStudy: () => Study | null;
  getDayNumber: () => number;

  // Derived
  getProgress: (studyId: number) => StudyProgress;
  getCompletionPercent: (studyId: number) => number;
  overallPercent: () => number;
  totalAnswered: () => number;
  totalHighlights: () => number;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                          */
/* ------------------------------------------------------------------ */

const defaultProgress = (studyId: number): StudyProgress => ({
  studyId, started: false, completed: false,
  answeredQuestions: {}, bookmarked: false, highlights: [],
});

const defaultPlan: StudyPlan = {
  configured: false,
  pace: "28days",
  startDate: new Date().toISOString(),
  reminderEnabled: false,
  reminderTime: "06:00",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const questionCount = (study: Study): number =>
  study.elements.filter((e) => e.kind === "question").length;

let _idCounter = 0;
function uid(): string { return `hl_${Date.now()}_${++_idCounter}`; }

/** How many total days in the plan */
function planTotalDays(plan: StudyPlan): number {
  switch (plan.pace) {
    case "28days": return 28;
    case "28weeks": return 28 * 7;
    case "1year": return 365;
    case "custom": return plan.customDays ?? 28;
  }
}

/** Which study number (1-28) should be done on a given day number (0-based) */
function studyForDay(dayIndex: number, totalDays: number): number {
  const daysPerStudy = totalDays / 28;
  return Math.min(28, Math.floor(dayIndex / daysPerStudy) + 1);
}

/* ------------------------------------------------------------------ */
/*  IDB storage                                                       */
/* ------------------------------------------------------------------ */

function createIDBStorage() {
  const DB_NAME = "joy-journey-db";
  const STORE_NAME = "kv";
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

  return createJSONStorage<Pick<AppStore, "progress" | "settings" | "studyPlan">>(() => ({
    async getItem(name: string): Promise<string | null> {
      try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, "readonly");
          const req = tx.objectStore(STORE_NAME).get(name);
          req.onsuccess = () => resolve(req.result ?? null);
          req.onerror = () => reject(req.error);
        });
      } catch { return localStorage.getItem(name); }
    },
    async setItem(name: string, value: string): Promise<void> {
      try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, "readwrite");
          tx.objectStore(STORE_NAME).put(value, name);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch { localStorage.setItem(name, value); }
    },
    async removeItem(name: string): Promise<void> {
      try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, "readwrite");
          tx.objectStore(STORE_NAME).delete(name);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch { localStorage.removeItem(name); }
    },
  }));
}

/* ------------------------------------------------------------------ */
/*  Store                                                             */
/* ------------------------------------------------------------------ */

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      studies: studiesData.studies as Study[],
      progress: {},
      settings: {
        fontSize: 16,
        fontFamily: "serif" as FontFamily,
        theme: "dark" as const,
        bibleVersion: "KJV",
        notificationsEnabled: false,
        currentStudyId: null,
      },
      studyPlan: { ...defaultPlan },

      /* ── Progress ──────────────────────────────────── */

      startStudy: (studyId) => set((s) => ({
        progress: { ...s.progress, [studyId]: {
          ...(s.progress[studyId] ?? defaultProgress(studyId)),
          started: true, lastAccessedAt: new Date().toISOString(),
        }},
      })),

      completeStudy: (studyId) => set((s) => ({
        progress: { ...s.progress, [studyId]: {
          ...(s.progress[studyId] ?? defaultProgress(studyId)),
          completed: true, completedAt: new Date().toISOString(),
          lastAccessedAt: new Date().toISOString(),
        }},
      })),

      uncompleteStudy: (studyId) => set((s) => {
        const prev = s.progress[studyId] ?? defaultProgress(studyId);
        return { progress: { ...s.progress, [studyId]: { ...prev, completed: false, completedAt: undefined } } };
      }),

      answerQuestion: (studyId, questionNum, answer) => set((s) => {
        const prev = s.progress[studyId] ?? defaultProgress(studyId);
        return { progress: { ...s.progress, [studyId]: {
          ...prev, started: true,
          answeredQuestions: { ...prev.answeredQuestions, [questionNum]: answer },
          lastAccessedAt: new Date().toISOString(),
        }}};
      }),

      clearAnswer: (studyId, questionNum) => set((s) => {
        const prev = s.progress[studyId] ?? defaultProgress(studyId);
        const { [questionNum]: _, ...rest } = prev.answeredQuestions;
        return { progress: { ...s.progress, [studyId]: { ...prev, answeredQuestions: rest } } };
      }),

      toggleBookmark: (studyId) => set((s) => {
        const prev = s.progress[studyId] ?? defaultProgress(studyId);
        return { progress: { ...s.progress, [studyId]: { ...prev, bookmarked: !prev.bookmarked } } };
      }),

      setStudyNotes: (studyId, notes) => set((s) => {
        const prev = s.progress[studyId] ?? defaultProgress(studyId);
        return { progress: { ...s.progress, [studyId]: { ...prev, notes } } };
      }),

      /* ── Highlights ────────────────────────────────── */

      addHighlight: (studyId, text, color, context) => set((s) => {
        const prev = s.progress[studyId] ?? defaultProgress(studyId);
        const hl: UserHighlight = { id: uid(), text, color, context, createdAt: new Date().toISOString() };
        return { progress: { ...s.progress, [studyId]: {
          ...prev, started: true,
          highlights: [...(prev.highlights ?? []), hl],
          lastAccessedAt: new Date().toISOString(),
        }}};
      }),

      removeHighlight: (studyId, highlightId) => set((s) => {
        const prev = s.progress[studyId] ?? defaultProgress(studyId);
        return { progress: { ...s.progress, [studyId]: {
          ...prev, highlights: (prev.highlights ?? []).filter((h) => h.id !== highlightId),
        }}};
      }),

      getHighlights: (studyId) => get().progress[studyId]?.highlights ?? [],

      getAllHighlights: () => {
        const { studies, progress } = get();
        const all: { studyId: number; studyTitle: string; highlight: UserHighlight }[] = [];
        for (const study of studies) {
          const p = progress[study.id];
          if (!p?.highlights?.length) continue;
          for (const h of p.highlights) all.push({ studyId: study.id, studyTitle: study.title, highlight: h });
        }
        return all.sort((a, b) => new Date(b.highlight.createdAt).getTime() - new Date(a.highlight.createdAt).getTime());
      },

      /* ── Settings ──────────────────────────────────── */

      setFontSize: (fontSize) => set((s) => ({ settings: { ...s.settings, fontSize: Math.max(12, Math.min(24, fontSize)) } })),
      setFontFamily: (fontFamily) => set((s) => ({ settings: { ...s.settings, fontFamily } })),
      setTheme: (theme) => set((s) => ({ settings: { ...s.settings, theme } })),
      setBibleVersion: (bibleVersion) => set((s) => ({ settings: { ...s.settings, bibleVersion } })),
      setCurrentStudy: (id) => set((s) => ({ settings: { ...s.settings, currentStudyId: id } })),

      /* ── Study plan ────────────────────────────────── */

      setupPlan: (pace, customDays) => set(() => ({
        studyPlan: {
          configured: true,
          pace,
          customDays: pace === "custom" ? customDays : undefined,
          startDate: new Date().toISOString(),
          reminderEnabled: false,
          reminderTime: "06:00",
        },
      })),

      setReminder: (enabled, time) => set((s) => ({
        studyPlan: {
          ...s.studyPlan,
          reminderEnabled: enabled,
          reminderTime: time ?? s.studyPlan.reminderTime,
        },
      })),

      getTodayStudy: () => {
        const { studies, studyPlan } = get();
        if (!studyPlan.configured) return studies[0] ?? null;
        const start = new Date(studyPlan.startDate);
        const now = new Date();
        const dayIndex = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const total = planTotalDays(studyPlan);
        const studyNum = studyForDay(Math.max(0, dayIndex), total);
        return studies.find((s) => s.number === studyNum) ?? studies[0];
      },

      getDayNumber: () => {
        const { studyPlan } = get();
        if (!studyPlan.configured) return 1;
        const start = new Date(studyPlan.startDate);
        const now = new Date();
        return Math.max(1, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      },

      /* ── Derived ───────────────────────────────────── */

      getProgress: (studyId) => get().progress[studyId] ?? defaultProgress(studyId),

      getCompletionPercent: (studyId) => {
        const study = get().studies.find((s) => s.id === studyId);
        if (!study) return 0;
        const total = questionCount(study);
        if (total === 0) return 0;
        const answered = Object.keys(get().progress[studyId]?.answeredQuestions ?? {}).length;
        return Math.round((answered / total) * 100);
      },

      overallPercent: () => {
        const { studies, progress } = get();
        const completed = studies.filter((s) => progress[s.id]?.completed).length;
        return Math.round((completed / studies.length) * 100);
      },

      totalAnswered: () => Object.values(get().progress).reduce((sum, p) => sum + Object.keys(p.answeredQuestions).length, 0),
      totalHighlights: () => Object.values(get().progress).reduce((sum, p) => sum + (p.highlights?.length ?? 0), 0),
    }),
    {
      name: "joy-journey-storage",
      version: 3,
      storage: createIDBStorage(),
      partialize: (state) => ({
        progress: state.progress,
        settings: state.settings,
        studyPlan: state.studyPlan,
      }),
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version < 2) {
          const progress = (state.progress ?? {}) as Record<number, StudyProgress>;
          for (const key of Object.keys(progress)) {
            const p = progress[Number(key)];
            if (!p.highlights) p.highlights = [];
          }
          state.progress = progress;
        }
        if (version < 3) {
          // Migrate fontSize from string to number
          const settings = (state.settings ?? {}) as Record<string, unknown>;
          if (typeof settings.fontSize === "string") {
            settings.fontSize = settings.fontSize === "small" ? 14 : settings.fontSize === "large" ? 20 : 16;
          }
          if (!settings.fontFamily) settings.fontFamily = "serif";
          state.settings = settings;
          // Add default study plan
          if (!state.studyPlan) {
            state.studyPlan = { ...defaultPlan };
          }
        }
        return state as { progress: Record<number, StudyProgress>; settings: AppSettings; studyPlan: StudyPlan };
      },
    },
  ),
);
