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
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { fetchFullBible, saveFullBibleToDB, isFullBibleDownloaded } from "@/lib/bibleApi";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useReadingStyle, FONT_LABELS } from "@/hooks/useReadingStyle";
import { showToast } from "@/components/ui/Toast";
import { isSoundEnabled, setSoundEnabled } from "@/lib/audio";
import {
  PROVIDERS,
  getStoredKey,
  getStoredProvider,
  storeKey,
  storeProvider,
  type ProviderId,
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
 * KJV, WEB, ASV = local/downloadable. GNB, ESV = online via BibleGateway.
 * The selector here only controls the MorePage preview & study display —
 * the BiblePage has its own translation switcher.
 */
const bibleVersions = ["KJV", "WEB", "ASV", "GNB", "ESV"];

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

  // Offline Bible download state
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(() =>
    isFullBibleDownloaded(bibleVersion.toLowerCase())
  );

  const totalAnswered = useAppStore((s) => s.totalAnswered());
  const totalHL = useAppStore((s) => s.totalHighlights());
  const completedCount = studies.filter((s) => progress[s.id]?.completed).length;
  const startedCount = Object.values(progress).filter((p) => p.started).length;
  const bookmarked = Object.values(progress).filter((p) => p.bookmarked).length;

  // Which versions can be downloaded locally (public/bibles/ files)
  const downloadableVersions = ["KJV", "WEB", "ASV"];
  const isDownloadable = downloadableVersions.includes(bibleVersion.toUpperCase());

  const handleDownloadBible = async () => {
    setDownloading(true);
    try {
      const version = bibleVersion.toLowerCase();
      showToast(`Downloading ${bibleVersion} Bible…`, { type: "info" });
      const fullBible = await fetchFullBible(version);
      await saveFullBibleToDB(version, fullBible);
      setDownloaded(true);
      showToast(`✅ ${bibleVersion} Bible saved for offline use!`, { type: "success" });
    } catch (err) {
      console.error("Bible download failed:", err);
      showToast(
        `Download failed — ${isOnline ? "Bible file may not exist on server." : "Check your internet connection."}`,
        { type: "error" }
      );
    } finally {
      setDownloading(false);
    }
  };

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
              <p className="text-base font-semibold">Install Joy in the Journey</p>
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
          {themes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                "flex flex-1 flex-col items-center gap-2 rounded-xl py-3.5 transition-all",
                theme === value ? "bg-gold-500/15 ring-1 ring-gold-500/30" : "bg-surface",
              )}
            >
              <Icon size={20} className={theme === value ? "text-gold-500" : "text-muted"} />
              <span className={cn("text-xs font-semibold", theme === value ? "text-gold-500" : "text-muted")}>
                {label}
              </span>
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

      {/* ── Offline Bible ────────────────────────────────── */}
      <Section icon={BookOpen} title="Offline Bible">
        <div className="flex flex-col gap-3">
          <p className="text-[12px] leading-relaxed text-muted">
            Download the selected Bible version to use completely offline.
            {!isDownloadable && (
              <span className="mt-1 block text-amber-400">
                {bibleVersion} is not available for download (online only). Switch to KJV, WEB, or ASV.
              </span>
            )}
          </p>

          <button
            onClick={handleDownloadBible}
            disabled={downloading || !isOnline || !isDownloadable}
            className="btn-primary flex items-center justify-center gap-2 py-4 disabled:opacity-40"
          >
            {downloading
              ? <><Loader2 size={18} className="animate-spin" /> Downloading…</>
              : <><Download size={18} /> Download {bibleVersion} for Offline</>}
          </button>

          {downloaded && !downloading && (
            <p className="flex items-center gap-1 text-xs text-emerald-500">
              <CheckCircle2 size={14} /> {bibleVersion} already downloaded
            </p>
          )}

          {!isOnline && (
            <p className="text-[11px] text-amber-500">
              Connect to the internet to download a Bible.
            </p>
          )}
        </div>
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
          KJV, WEB, ASV can be downloaded offline. GNB &amp; ESV open in BibleGateway.
        </p>
        <div className="flex flex-wrap gap-2">
          {bibleVersions.map((v) => (
            <button
              key={v}
              onClick={() => {
                setBibleVersion(v);
                // Re-check downloaded status for the newly selected version
                setDownloaded(isFullBibleDownloaded(v.toLowerCase()));
              }}
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

      {/* ── AI Settings ─────────────────────────────────── */}
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
          <strong className="font-display text-sm">Joy in the Journey</strong> — 28 interactive Bible studies from the SDA Bible Study Series.
        </p>
        <div className="divider my-3" />
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted">Version 1.0.0</p>
          <p className="text-[11px] text-muted">PWA · React · TypeScript</p>
        </div>
      </div>

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
  const [activeProvider, setActiveProvider] = useState<ProviderId | null>(() => getStoredProvider());
  const [editingKey, setEditingKey] = useState(false);
  const [keyInput, setKeyInput] = useState("");

  const currentProvider = PROVIDERS.find((p) => p.id === activeProvider);
  const hasKey = activeProvider ? !!getStoredKey(activeProvider) : false;

  const handleSelectProvider = (pid: ProviderId) => {
    storeProvider(pid);
    setActiveProvider(pid);
    setKeyInput(getStoredKey(pid) ?? "");
    setEditingKey(true);
  };

  const handleSaveKey = () => {
    if (!activeProvider || !keyInput.trim()) return;
    storeKey(activeProvider, keyInput.trim());
    setEditingKey(false);
    showToast(`${currentProvider?.name} key saved`, { type: "success" });
  };

  return (
    <Section icon={Sparkles} title="AI Assistant">
      <p className="text-[12px] leading-relaxed text-muted">
        Connect an AI to help explain Scripture in plain English. Your key is stored only on this device.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => handleSelectProvider(p.id)}
            className={cn(
              "card card-surface card-interactive flex flex-col items-center gap-1 py-2.5 text-center",
              activeProvider === p.id && "bg-gold-500/5 ring-2 ring-gold-500/40",
            )}
          >
            <span className="text-base">{p.emoji}</span>
            <span className="text-[12px] font-semibold">{p.name}</span>
            <span className={cn(
              "rounded-full px-1.5 py-0.5 text-2xs font-bold",
              p.tier === "free"
                ? "bg-emerald-500/15 text-emerald-500"
                : "bg-gold-500/10 text-gold-500",
            )}>
              {p.tier === "free" ? "Free" : "Paid"}
            </span>
          </button>
        ))}
      </div>

      {activeProvider && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-secondary">
              {currentProvider?.emoji} {currentProvider?.name}
            </span>
            {hasKey && !editingKey && (
              <span className="text-[11px] font-semibold text-emerald-500">Connected ✓</span>
            )}
          </div>

          {(editingKey || !hasKey) && (
            <div className="flex flex-col gap-2">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Paste API key…"
                className="input font-mono text-sm"
              />
              <a
                href={currentProvider?.keyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-gold-500"
              >
                <ExternalLink size={10} /> {currentProvider?.keyHint}
              </a>
              <button
                onClick={handleSaveKey}
                className="btn-primary text-sm"
                disabled={!keyInput.trim()}
              >
                Save Key
              </button>
            </div>
          )}

          {hasKey && !editingKey && (
            <button
              onClick={() => { setKeyInput(getStoredKey(activeProvider) ?? ""); setEditingKey(true); }}
              className="btn-secondary text-xs"
            >
              Change Key
            </button>
          )}
        </div>
      )}
    </Section>
  );
}
