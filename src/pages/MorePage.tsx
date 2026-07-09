import { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  BookOpen,
  Type,
  Palette,
  Info,
  Trash2,
  Download,
  Smartphone,
  Share,
  Highlighter,
  CheckCircle2,
  Bell,
  BellOff,
  Clock,
  Calendar,
  Minus,
  Plus,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { BibleLanguageManager } from "@/components/ui/BibleLanguageManager";
import { StudyPlanSetup } from "@/components/ui/StudyPlanSetup";
import { StudyGroupPanel } from "@/components/ui/StudyGroupPanel";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useReadingStyle, FONT_LABELS } from "@/hooks/useReadingStyle";
import { showToast } from "@/components/ui/Toast";
import { isSoundEnabled, setSoundEnabled } from "@/lib/audio";
import { shareOrCopy } from "@/lib/sharing";
import { cn } from "@/lib/utils";
import type { AppSettings, FontFamily } from "@/data/types";

/* ── Config ───────────────────────────────────────────── */

const themes: { value: AppSettings["theme"]; label: string; icon: typeof Sun }[] = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "sepia", label: "Sepia", icon: BookOpen },
];

const fontFamilies: FontFamily[] = ["sans", "serif", "mono"];

const FONT_CSS: Record<FontFamily, string> = {
  sans: '"DM Sans", system-ui, sans-serif',
  serif: '"Lora", "EB Garamond", Georgia, serif',
  mono: '"Source Code Pro", monospace',
};

const APP_SHARE_MESSAGE = [
  `✝️ *SDA Bible Study Companion*`,
  ``,
  `A free Bible study app with 28 Adventist studies, an offline Bible, journaling and study groups.`,
  ``,
  `Get it here:`,
  `leemcq.github.io/joy-in-the-journey`,
].join("\n");

/* ── Page ─────────────────────────────────────────────── */

export function MorePage() {
  useTheme();
  const theme = useAppStore((s) => s.settings.theme);
  const fontSize = useAppStore((s) => s.settings.fontSize);
  const fontFamily = useAppStore((s) => s.settings.fontFamily);
  const bibleBookmark = useAppStore((s) => s.bibleBookmark);
  const setTheme = useAppStore((s) => s.setTheme);
  const setFontSize = useAppStore((s) => s.setFontSize);
  const setFontFamily = useAppStore((s) => s.setFontFamily);
  const setReminder = useAppStore((s) => s.setReminder);
  const studies = useAppStore((s) => s.studies);
  const progress = useAppStore((s) => s.progress);
  const studyPlan = useAppStore((s) => s.studyPlan);

  const { canInstall, isInstalled, isIOS, install } = useInstallPrompt();
  const readingStyle = useReadingStyle();
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [showPlanSetup, setShowPlanSetup] = useState(false);

  // Show the Bible Languages downloader only while a translation is still missing.
  const [bibleLangsPending, setBibleLangsPending] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const { TRANSLATIONS, isTranslationInstalled } = await import("@/lib/bibleDB");
        const installed = await Promise.all(TRANSLATIONS.map((t) => isTranslationInstalled(t.id)));
        setBibleLangsPending(installed.some((ok) => !ok));
      } catch { setBibleLangsPending(true); }
    })();
  }, []);

  const totalAnswered = useAppStore((s) => s.totalAnswered());
  const totalHL = useAppStore((s) => s.totalHighlights());
  const completedCount = studies.filter((s) => progress[s.id]?.completed).length;
  const startedCount = Object.values(progress).filter((p) => p.started).length;
  const bookmarked = Object.values(progress).filter((p) => p.bookmarked).length;



  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-5 px-5 pb-8 pt-10 md:px-8">
      {showPlanSetup && <StudyPlanSetup onComplete={() => setShowPlanSetup(false)} />}
      <h1 className="font-display text-[24px] font-bold">Settings</h1>

      {/* ── Share App ─────────────────────────────────────── */}
      <Section icon={Share} title="Share App">
        <p className="text-[12px] text-muted">Share the app with friends and family, or install it on this device for offline access.</p>
        <button onClick={() => shareOrCopy(APP_SHARE_MESSAGE, (msg) => showToast(msg))} className="btn-primary w-full">
          <Share size={16} /> Share app
        </button>
        {canInstall && (
          <button
            onClick={async () => {
              const ok = await install();
              if (ok) showToast("App installed! 🎉", { type: "success" });
            }}
            className="btn-secondary w-full"
          >
            <Download size={16} /> Install / download app
          </button>
        )}
        {isIOS && !isInstalled && (
          <p className="text-[12px] text-muted">On iPhone: tap <span className="font-semibold text-secondary">Share → Add to Home Screen</span> to install.</p>
        )}
        {isInstalled && (
          <div className="flex items-center gap-2 rounded-xl bg-gold-500/10 px-3 py-2">
            <Smartphone size={14} className="text-gold-500" />
            <p className="text-sm font-medium text-gold-500">Installed on this device</p>
          </div>
        )}
      </Section>

      {/* ── Theme ────────────────────────────────────────── */}
      <Section icon={Palette} title="Appearance">
        <div className="flex gap-2">
          {themes.map(({ value, label }) => (
            <button key={value} onClick={() => setTheme(value)} className={cn("flex flex-1 flex-col items-center gap-1.5 rounded-xl p-2 transition-all border-2", theme === value ? "border-gold-500" : "border-transparent bg-surface")}>
              <div className={cn("w-full rounded-lg p-2 text-left", value === "dark" && "bg-[#0f1729]", value === "light" && "bg-white", value === "sepia" && "bg-[#f5f0e6]")}>
                <div className={cn("text-[9px] font-bold mb-0.5", value === "dark" && "text-[#d4a017]", value === "light" && "text-[#8c6a0f]", value === "sepia" && "text-[#8c6a0f]")}>Study 1</div>
                <div className={cn("text-[8px] leading-tight", value === "dark" && "text-[#a8b2cc]", value === "light" && "text-[#4e6396]", value === "sepia" && "text-[#5c4b37]")}>In the beginning...</div>
              </div>
              <span className={cn("text-[11px] font-bold capitalize", theme === value ? "text-gold-500" : "text-muted")}>{label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* ── Sound & Haptics ─────────────────────────────── */}
      <Section icon={Volume2} title="Sound & Haptics">
        <button
          onClick={() => {
            const next = !soundOn;
            setSoundEnabled(next);
            setSoundOn(next);
          }}
          className={cn(
            "flex items-center gap-3 rounded-xl p-3 transition-all",
            soundOn ? "bg-gold-500/10 ring-1 ring-gold-500/20" : "bg-surface",
          )}
        >
          {soundOn
            ? <Volume2 size={18} className="text-gold-500" />
            : <VolumeX size={18} className="text-muted" />}
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-primary">{soundOn ? "Sounds On" : "Sounds Off"}</p>
            <p className="text-[12px] text-muted">Tap feedback, chimes &amp; haptics</p>
          </div>
          <div className={cn("h-6 w-11 rounded-full p-0.5 transition-colors", soundOn ? "bg-gold-500" : "bg-surface")}>
            <div className={cn("h-5 w-5 rounded-full bg-white shadow transition-transform", soundOn && "translate-x-5")} />
          </div>
        </button>
      </Section>

      {/* ── Bible Languages (only while something is still downloadable) ── */}
      {bibleLangsPending && (
        <Section icon={BookOpen} title="Bible Languages">
          <BibleLanguageManager />
        </Section>
      )}

      {/* ── Study Plan ────────────────────────────────────── */}
      <Section icon={Calendar} title="Study Plan">
        <button
          onClick={() => setShowPlanSetup(true)}
          className="card card-surface card-interactive flex w-full items-center gap-3 text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-500/10">
            <Calendar size={18} className="text-gold-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-primary">
              {studyPlan.configured ? "Edit study plan" : "Set up study plan"}
            </p>
            <p className="text-muted text-[12px]">
              {studyPlan.configured ? "Change your pace or start date" : "Choose a pace to get a daily study"}
            </p>
          </div>
          <ArrowRight size={16} className="shrink-0 text-muted" />
        </button>
      </Section>

      {/* ── Font Size ────────────────────────────────────── */}
      <Section icon={Type} title="Text Size">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFontSize(fontSize - 1)}
            disabled={fontSize <= 12}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface active:scale-90 disabled:opacity-30"
            aria-label="Decrease font size"
          >
            <Minus size={14} />
          </button>
          <div className="flex-1">
            <input
              type="range"
              min={12}
              max={24}
              step={1}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="range-gold w-full"
              aria-label="Font size"
            />
          </div>
          <button
            onClick={() => setFontSize(fontSize + 1)}
            disabled={fontSize >= 24}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface active:scale-90 disabled:opacity-30"
            aria-label="Increase font size"
          >
            <Plus size={14} />
          </button>
          <span className="w-8 text-center text-xs font-bold tabular-nums text-gold-500">{fontSize}</span>
        </div>

        {/* Typeface selector */}
        <p className="mt-1 text-2xs font-bold uppercase tracking-caps text-muted">Typeface</p>
        <div className="flex gap-2">
          {fontFamilies.map((fam) => (
            <button
              key={fam}
              onClick={() => setFontFamily(fam)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl py-3 transition-all",
                fontFamily === fam ? "bg-gold-500/15 ring-1 ring-gold-500/30" : "bg-surface",
              )}
            >
              <span
                className={cn("text-lg font-semibold", fontFamily === fam ? "text-gold-500" : "text-secondary")}
                style={{ fontFamily: FONT_CSS[fam] }}
              >
                Aa
              </span>
              <span className={cn("text-2xs font-semibold", fontFamily === fam ? "text-gold-500" : "text-muted")}>
                {FONT_LABELS[fam]}
              </span>
            </button>
          ))}
        </div>

        {/* Live preview */}
        <div className="mt-3 rounded-xl bg-surface p-3">
          <p className="mb-1 text-2xs font-semibold uppercase tracking-caps text-muted">Preview</p>
          <p className="leading-relaxed text-secondary" style={readingStyle}>
            "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life."
          </p>
          <p className="mt-1 text-[11px] italic text-muted" style={{ fontFamily: FONT_CSS[fontFamily] }}>
            — John 3:16, {(bibleBookmark?.translation ?? "afr").toUpperCase()}
          </p>
        </div>
      </Section>

      {/* ── Study Group ──────────────────────────────────── */}
      <p className="text-[10px] font-bold uppercase tracking-widest text-gold-500/60 px-1 mt-2">Daily Rhythm</p>
      <Section icon={Sparkles} title="Study Group">
        <StudyGroupPanel variant="full" />
      </Section>

      {/* ── Daily Reminder ───────────────────────────────── */}
      <Section icon={Bell} title="Daily Reminder">
        <button
          onClick={() => setReminder(!studyPlan.reminderEnabled, studyPlan.reminderTime)}
          className={cn(
            "flex items-center gap-3 rounded-xl p-3 transition-all",
            studyPlan.reminderEnabled ? "bg-gold-500/10 ring-1 ring-gold-500/20" : "bg-surface",
          )}
        >
          {studyPlan.reminderEnabled
            ? <Bell size={18} className="text-gold-500" />
            : <BellOff size={18} className="text-muted" />}
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold">
              {studyPlan.reminderEnabled ? "Reminder On" : "Reminder Off"}
            </p>
          </div>
          <div className={cn("h-6 w-11 rounded-full p-0.5 transition-colors", studyPlan.reminderEnabled ? "bg-gold-500" : "bg-surface")}>
            <div className={cn("h-5 w-5 rounded-full bg-white shadow transition-transform", studyPlan.reminderEnabled && "translate-x-5")} />
          </div>
        </button>

        {studyPlan.reminderEnabled && (
          <div className="flex items-center gap-3 animate-slide-up">
            <Clock size={16} className="text-gold-500/60" />
            <input
              type="time"
              value={studyPlan.reminderTime}
              onChange={(e) => setReminder(true, e.target.value)}
              className="flex-1 rounded-xl border border-theme bg-surface px-4 py-2.5 text-center font-bold outline-none focus:border-gold-500/40"
            />
          </div>
        )}
      </Section>

      {/* ── Statistics ───────────────────────────────────── */}
      <Section icon={Info} title="Study Statistics">
        <div className="flex flex-col gap-2 text-sm">
          <Row label="Total studies" value={String(studies.length)} />
          <Row label="Started" value={String(startedCount)} />
          <Row label="Completed" value={String(completedCount)} icon={<CheckCircle2 size={12} className="text-gold-500/60" />} />
          <Row label="Questions answered" value={String(totalAnswered)} />
          <Row label="Highlights" value={String(totalHL)} icon={<Highlighter size={12} className="text-gold-500/60" />} />
          <Row label="Bookmarked" value={String(bookmarked)} />
        </div>
      </Section>

      {/* ── Reset ────────────────────────────────────────── */}
      <button
        onClick={() => {
          if (confirm("Reset all progress, plan, and settings? This cannot be undone.")) {
            indexedDB.deleteDatabase("joy-journey-db");
            indexedDB.deleteDatabase("joy-bible-cache");
            indexedDB.deleteDatabase("joy-journey-bible");
            localStorage.removeItem("joy-journey-storage");
            // Clear all fullBible_ flags
            Object.keys(localStorage)
              .filter((k) => k.startsWith("fullBible_"))
              .forEach((k) => localStorage.removeItem(k));
            showToast("All data reset", { type: "info" });
            setTimeout(() => window.location.reload(), 500);
          }
        }}
        className="flex items-center justify-center gap-2 rounded-xl border border-red-500/20 py-3 text-sm font-medium text-red-400 active:bg-red-500/10"
      >
        <Trash2 size={16} /> Reset Everything
      </button>
    </div>
  );
}

/* ── Section wrapper ──────────────────────────────────── */

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Sun;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card card-surface flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-gold-500" />
        <h2 className="text-xs font-bold uppercase tracking-caps text-gold-500">{title}</h2>
      </div>
      {children}
    </section>
  );
}

/* ── Stats row ────────────────────────────────────────── */

function Row({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="flex items-center gap-1.5 font-semibold">{icon}{value}</span>
    </div>
  );
}
