import { useState } from "react";
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
  Wifi,
  WifiOff,
  Highlighter,
  CheckCircle2,
  Heart,
  Bell,
  BellOff,
  Clock,
  Calendar,
  Minus,
  Plus,
  Volume2,
  VolumeX,
  Sparkles,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { BibleLanguageManager } from "@/components/ui/BibleLanguageManager";
import { StudyGroupPanel } from "@/components/ui/StudyGroupPanel";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useReadingStyle, FONT_LABELS } from "@/hooks/useReadingStyle";
import { showToast } from "@/components/ui/Toast";
import { isSoundEnabled, setSoundEnabled } from "@/lib/audio";
import {
  getStoredMode,
  storeMode,
  type AIMode,
} from "@/lib/aiProvider";
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

/**
 * Bible versions shown in the selector.
 * AFR, KJV, WEB = local/downloadable. GNB, ESV = online via BibleGateway.
 * The selector here only controls the MorePage preview & study display —
 * the BiblePage has its own translation switcher.
 */
const bibleVersions = ["AFR", "KJV", "WEB", "GNB", "ESV"];

const PACE_LABELS: Record<string, string> = {
  "28days": "28 Days (1/day)",
  "28weeks": "28 Weeks (1/week)",
  "1year": "1 Year",
  custom: "Custom",
};

/* ── Page ─────────────────────────────────────────────── */

export function MorePage() {
  useTheme();
  const theme = useAppStore((s) => s.settings.theme);
  const fontSize = useAppStore((s) => s.settings.fontSize);
  const fontFamily = useAppStore((s) => s.settings.fontFamily);
  const bibleVersion = useAppStore((s) => s.settings.bibleVersion);
  const setTheme = useAppStore((s) => s.setTheme);
  const setFontSize = useAppStore((s) => s.setFontSize);
  const setFontFamily = useAppStore((s) => s.setFontFamily);
  const setBibleVersion = useAppStore((s) => s.setBibleVersion);
  const setReminder = useAppStore((s) => s.setReminder);
  const studies = useAppStore((s) => s.studies);
  const progress = useAppStore((s) => s.progress);
  const studyPlan = useAppStore((s) => s.studyPlan);

  const { canInstall, isInstalled, isIOS, install } = useInstallPrompt();
  const readingStyle = useReadingStyle();
  const [isOnline] = useState(() => navigator.onLine);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());

  const totalAnswered = useAppStore((s) => s.totalAnswered());
  const totalHL = useAppStore((s) => s.totalHighlights());
  const completedCount = studies.filter((s) => progress[s.id]?.completed).length;
  const startedCount = Object.values(progress).filter((p) => p.started).length;
  const bookmarked = Object.values(progress).filter((p) => p.bookmarked).length;



  return (
    <div className="flex flex-col gap-5 px-5 pb-8 pt-10">
      <h1 className="font-display text-[24px] font-bold">Settings</h1>

      {/* ── Install App ─────────────────────────────────── */}
      {(canInstall || isIOS) && (
        <div className="card card-gold mb-6 overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-500/15">
              <Download size={20} className="text-gold-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold">Install SDA Bible Study Companion</p>
              <p className="text-sm text-muted">
                {isIOS ? 'Tap Share → "Add to Home Screen"' : "Add to your home screen for offline access"}
              </p>
            </div>
            {canInstall && (
              <button
                onClick={async () => {
                  const ok = await install();
                  if (ok) showToast("App installed! 🎉", { type: "success" });
                }}
                className="btn-primary px-6 py-2 text-sm font-semibold"
              >
                Install
              </button>
            )}
            {isIOS && <Share size={20} className="shrink-0 text-gold-500" />}
          </div>
        </div>
      )}

      {isInstalled && (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-gold-500/10 px-3 py-2">
          <Smartphone size={14} className="text-gold-500" />
          <p className="text-sm font-medium text-gold-500">App is installed on your device</p>
        </div>
      )}

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
            <p className="text-sm font-semibold">{soundOn ? "Sounds On" : "Sounds Off"}</p>
            <p className="text-[12px] text-muted">Tap feedback, chimes &amp; haptics</p>
          </div>
          <div className={cn("h-6 w-11 rounded-full p-0.5 transition-colors", soundOn ? "bg-gold-500" : "bg-surface")}>
            <div className={cn("h-5 w-5 rounded-full bg-white shadow transition-transform", soundOn && "translate-x-5")} />
          </div>
        </button>
      </Section>

      {/* ── Bible Languages ───────────────────────────────── */}
      <p className="text-[10px] font-bold uppercase tracking-widest text-gold-500/60 px-1 mt-2">Bible &amp; AI</p>
      <Section icon={BookOpen} title="Bible Languages">
        <BibleLanguageManager />
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
            — John 3:16, {bibleVersion}
          </p>
        </div>
      </Section>

      {/* ── Bible Version ────────────────────────────────── */}
      <Section icon={BookOpen} title="Bible Version">
        <p className="text-[11px] text-muted mb-2">
          AFR, KJV, WEB kan vanlyn afgelaai word. GNB &amp; ESV open in BibleGateway.
        </p>
        <div className="flex flex-wrap gap-2">
          {bibleVersions.map((v) => (
            <button
              key={v}
              onClick={() => setBibleVersion(v)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                bibleVersion === v
                  ? "bg-gold-500 text-navy-900 shadow-gold-glow"
                  : "bg-surface text-muted",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Study Group ──────────────────────────────────── */}
      <p className="text-[10px] font-bold uppercase tracking-widest text-gold-500/60 px-1 mt-2">Daily Rhythm</p>
      <Section icon={Sparkles} title="Study Group">
        <StudyGroupPanel variant="full" />
      </Section>

      {/* ── AI Settings ─────────────────────────────────── */}
      <p className="text-[10px] font-bold uppercase tracking-widest text-gold-500/60 px-1 mt-2">Reading Experience</p>
      <AISettingsSection />

      {/* ── Study Plan ───────────────────────────────────── */}
      <Section icon={Calendar} title="Study Plan">
        {studyPlan.configured ? (
          <div className="flex flex-col gap-2 text-sm">
            <Row label="Plan" value={PACE_LABELS[studyPlan.pace] ?? studyPlan.pace} />
            {studyPlan.pace === "custom" && studyPlan.customDays && (
              <Row label="Duration" value={`${studyPlan.customDays} days`} />
            )}
            <Row label="Started" value={new Date(studyPlan.startDate).toLocaleDateString()} />
          </div>
        ) : (
          <p className="text-[13px] text-muted">No plan set — use the home screen to set one up.</p>
        )}
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

      {/* ── Connection status ─────────────────────────────── */}
      <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5">
        {isOnline ? (
          <><Wifi size={14} className="text-emerald-500" /><p className="text-[12px] text-muted">Online</p></>
        ) : (
          <><WifiOff size={14} className="text-amber-500" /><p className="text-[12px] text-muted">Offline — cached data available</p></>
        )}
      </div>

      {/* ── About ────────────────────────────────────────── */}
      <div className="card card-surface">
        <div className="mb-2 flex items-center gap-2">
          <Heart size={14} className="text-gold-500" />
          <p className="text-xs font-bold uppercase tracking-caps text-gold-500">About</p>
        </div>
        <p className="text-[13px] leading-relaxed text-secondary">
          <strong className="font-display text-sm">SDA Bible Study Companion</strong> — 28 interactive Bible studies grounded in Adventist theology.
        </p>
        <div className="divider my-3" />
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted">Version 1.0.0</p>
          <p className="text-[11px] text-muted">PWA · React · TypeScript</p>
        </div>
      </div>

      {/* ── About ────────────────────────────────────────── */}
      <Section icon={BookOpen} title="About This App">
        <div className="flex flex-col gap-2">
          <p className="text-[13px] leading-relaxed text-muted">This app is an independent ministry tool built to support SDA Bible study. Content is based on the 28 Fundamental Beliefs of the Seventh-day Adventist Church.</p>
          <a href="https://www.adventist.org" target="_blank" rel="noopener noreferrer" className="text-[13px] font-semibold text-gold-500">adventist.org ↗</a>
          <p className="text-[11px] text-muted italic">Built with ♥ for the Southern African SDA community</p>
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

/* ── AI Settings sub-section ──────────────────────────── */

function AISettingsSection() {
  const [mode, setMode] = useState<AIMode>(getStoredMode);

  const handleMode = (m: AIMode) => {
    setMode(m);
    storeMode(m);
    showToast(`AI mode set to ${m === "deep" ? "Deep" : "Normal"}`, { type: "success" });
  };

  return (
    <Section icon={Sparkles} title="AI Assistant">
      <p className="text-[12px] leading-relaxed text-muted">
        Choose how the AI responds. Switch anytime — your preference is saved.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {(["normal", "deep"] as AIMode[]).map((m) => (
          <button
            key={m}
            onClick={() => handleMode(m)}
            className={cn(
              "card card-surface card-interactive flex flex-col items-center gap-1 py-3 text-center",
              mode === m && "bg-gold-500/5 ring-2 ring-gold-500/40",
            )}
          >
            <span className="text-lg">{m === "normal" ? "⚡" : "🔬"}</span>
            <span className="text-[13px] font-bold">
              {m === "normal" ? "Normal" : "Deep"}
            </span>
            <span className="text-[11px] text-muted leading-tight text-center px-1">
              {m === "normal"
                ? "Fast everyday answers"
                : "Thorough research-grade responses"}
            </span>
            {mode === m && (
              <span className="mt-1 rounded-full bg-gold-500/20 px-2 py-0.5 text-2xs font-bold text-gold-500">
                Active
              </span>
            )}
          </button>
        ))}
      </div>
    </Section>
  );
}
