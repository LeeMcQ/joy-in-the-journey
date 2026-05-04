import { useState, useRef } from "react";
import {
  Calendar,
  Clock,
  Bell,
  BellOff,
  ChevronRight,
  Sparkles,
  BookOpen,
  Download,
  CheckCircle2,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useTheme } from "@/components/ui/ThemeProvider";
import { cn } from "@/lib/utils";
import {
  downloadTranslation,
  LOCAL_TRANSLATIONS,
  type DownloadProgress,
} from "@/lib/localBible";
import { AIKeySetup } from "@/components/ui/AIKeySetup";
import type { StudyPace } from "@/data/types";

/* ── Pace options ─────────────────────────────────────── */

const PACES: {
  id: StudyPace;
  label: string;
  sub: string;
  icon: typeof Calendar;
  detail: string;
}[] = [
  {
    id: "28days",
    label: "28 Days",
    sub: "Intensive — 1 study per day",
    icon: Sparkles,
    detail: "Complete the series in one month",
  },
  {
    id: "28weeks",
    label: "28 Weeks",
    sub: "Weekly — 1 study per week",
    icon: Calendar,
    detail: "About 7 months at a relaxed pace",
  },
  {
    id: "1year",
    label: "1 Year",
    sub: "Gentle — spread across 12 months",
    icon: BookOpen,
    detail: "~13 days per study with margin",
  },
  {
    id: "custom",
    label: "Custom",
    sub: "Choose your own time period",
    icon: Clock,
    detail: "Set exactly how many days",
  },
];

/* ── Component ────────────────────────────────────────── */

interface Props {
  onComplete: () => void;
}

export function StudyPlanSetup({ onComplete }: Props) {
  const { isDark } = useTheme();
  const setupPlan = useAppStore((s) => s.setupPlan);
  const setReminder = useAppStore((s) => s.setReminder);

  const [step, setStep] = useState<"pace" | "custom" | "reminder" | "bible" | "ai">("pace");
  const [selectedPace, setSelectedPace] = useState<StudyPace>("28days");
  const [customDays, setCustomDays] = useState(56);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState("06:00");

  // Bible download
  const [dlProgress, setDlProgress] = useState<DownloadProgress | null>(null);
  const [dlDone, setDlDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // AI setup
  const [showAISetup, setShowAISetup] = useState(false);

  /* ── Request notification permission ────────────────── */
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    const result = await Notification.requestPermission();
    return result === "granted";
  };

  /* ── Handle finish ──────────────────────────────────── */
  const handleFinish = async () => {
    setupPlan(selectedPace, selectedPace === "custom" ? customDays : undefined);

    if (reminderEnabled) {
      const granted = await requestNotificationPermission();
      setReminder(granted, reminderTime);
      if (granted) scheduleReminder(reminderTime);
    } else {
      setReminder(false);
    }

    onComplete();
  };

  // If AIKeySetup is showing, render it at full z-index above everything
  if (showAISetup) {
    return (
      <AIKeySetup
        onComplete={(_providerId) => { setShowAISetup(false); handleFinish(); }}
        onSkip={() => { setShowAISetup(false); handleFinish(); }}
      />
    );
  }

  return (
    /* ── FIX: z-[9999] ensures this is always above the bottom nav bar (z-50).
       The bottom nav must never overlap the onboarding modal.
       We use 100dvh (dynamic viewport height) so mobile browser chrome
       doesn't cause overflow, and pb-safe adds padding above the home
       indicator / gesture bar on notched phones. ── */
    <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center"
         style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 animate-fade-in" />

      {/* Modal */}
      <div
        className={cn(
          "relative z-10 w-full max-w-md animate-slide-up",
          // FIX: max height uses dvh and leaves room for the nav bar.
          // overflow-y-auto lets content scroll if steps are tall on small phones.
          "flex flex-col overflow-y-auto",
          "rounded-t-3xl sm:rounded-3xl",
          // FIX: bottom padding ensures Back/Continue buttons are never
          // behind the nav bar. 80px covers the nav + safe area on most devices.
          "pb-[80px] sm:pb-0",
          // Cap height so it never takes over the whole screen
          "max-h-[calc(100dvh-env(safe-area-inset-top,0px))]",
          isDark ? "bg-navy-700" : "bg-elevated",
        )}
      >
        {/* Handle — only on mobile portrait */}
        <div className="flex justify-center py-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-muted opacity-30" />
        </div>

        {/* ── STEP 1: Pace selection ─────────────────────── */}
        {step === "pace" && (
          <div className="flex flex-col gap-5 px-6 pb-6 pt-2">
            <div className="text-center">
              <h2 className="font-display text-xl font-bold">Welcome!</h2>
              <p className="text-muted mt-1 text-sm">
                How would you like to study the 28 lessons?
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {PACES.map(({ id, label, sub, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setSelectedPace(id)}
                  className={cn(
                    "card card-surface card-interactive flex items-center gap-3 text-left",
                    selectedPace === id && "ring-2 ring-gold-500/40 bg-gold-500/5",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                      selectedPace === id ? "bg-gold-500/20" : "bg-surface",
                    )}
                  >
                    <Icon
                      size={18}
                      className={selectedPace === id ? "text-gold-500" : "text-muted"}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-muted text-[12px]">{sub}</p>
                  </div>
                  <div
                    className={cn(
                      "h-5 w-5 rounded-full border-2 transition-all",
                      selectedPace === id
                        ? "border-gold-500 bg-gold-500"
                        : "border-muted",
                    )}
                  >
                    {selectedPace === id && (
                      <div className="h-full w-full rounded-full border-2 border-navy-700" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                if (selectedPace === "custom") setStep("custom");
                else setStep("reminder");
              }}
              className="btn-primary w-full"
            >
              Continue <ChevronRight size={16} />
            </button>
            <button
              onClick={() => { setupPlan("28days"); onComplete(); }}
              className="btn-ghost w-full text-sm"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* ── STEP 1b: Custom days ───────────────────────── */}
        {step === "custom" && (
          <div className="flex flex-col gap-5 px-6 pb-6 pt-2">
            <div className="text-center">
              <h2 className="font-display text-xl font-bold">Custom Period</h2>
              <p className="text-muted mt-1 text-sm">
                How many days for all 28 studies?
              </p>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCustomDays(Math.max(28, customDays - 7))}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-lg font-bold active:scale-95"
                >
                  −
                </button>
                <div className="text-center">
                  <p className="font-display text-4xl font-bold text-gold-500">
                    {customDays}
                  </p>
                  <p className="text-muted text-xs">days</p>
                </div>
                <button
                  onClick={() => setCustomDays(Math.min(730, customDays + 7))}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-lg font-bold active:scale-95"
                >
                  +
                </button>
              </div>

              <input
                type="range"
                min={28}
                max={730}
                step={1}
                value={customDays}
                onChange={(e) => setCustomDays(Number(e.target.value))}
                className="range-gold w-full"
              />

              <p className="text-muted text-xs text-center">
                ≈ {Math.ceil(customDays / 28)} days per study ·{" "}
                {customDays >= 365
                  ? `${(customDays / 365).toFixed(1)} years`
                  : customDays >= 30
                    ? `${Math.round(customDays / 30)} months`
                    : `${customDays} days`}
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep("pace")} className="btn-secondary flex-1">
                Back
              </button>
              <button onClick={() => setStep("reminder")} className="btn-primary flex-1">
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Reminder ───────────────────────────── */}
        {step === "reminder" && (
          <div className="flex flex-col gap-5 px-6 pb-6 pt-2">
            <div className="text-center">
              <h2 className="font-display text-xl font-bold">Daily Reminder</h2>
              <p className="text-muted mt-1 text-sm">
                Get a notification with today's study topic
              </p>
            </div>

            <button
              onClick={() => setReminderEnabled(!reminderEnabled)}
              className={cn(
                "card card-surface flex items-center gap-3",
                reminderEnabled && "ring-2 ring-gold-500/30",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  reminderEnabled ? "bg-gold-500/20" : "bg-surface",
                )}
              >
                {reminderEnabled ? (
                  <Bell size={18} className="text-gold-500" />
                ) : (
                  <BellOff size={18} className="text-muted" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">
                  {reminderEnabled ? "Reminder On" : "No Reminder"}
                </p>
                <p className="text-muted text-[12px]">
                  {reminderEnabled
                    ? "You'll get a daily notification"
                    : "You can enable this later in Settings"}
                </p>
              </div>
              <div
                className={cn(
                  "h-7 w-12 rounded-full p-0.5 transition-colors",
                  reminderEnabled ? "bg-gold-500" : "bg-surface",
                )}
              >
                <div
                  className={cn(
                    "h-6 w-6 rounded-full bg-white shadow transition-transform",
                    reminderEnabled && "translate-x-5",
                  )}
                />
              </div>
            </button>

            {reminderEnabled && (
              <div className="card card-surface animate-slide-up">
                <p className="text-muted mb-2 text-2xs font-bold uppercase tracking-caps">
                  Reminder Time
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Clock size={18} className="text-gold-500/60" />
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-center text-lg font-bold",
                      "bg-surface border-theme outline-none",
                      "focus:border-gold-500/40 focus:ring-2 focus:ring-gold-500/10",
                    )}
                  />
                </div>
                <p className="text-muted mt-2 text-center text-[11px]">
                  Default: 6:00 AM — tap to change
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(selectedPace === "custom" ? "custom" : "pace")}
                className="btn-secondary flex-1"
              >
                Back
              </button>
              <button onClick={() => setStep("bible")} className="btn-primary flex-1">
                <Download size={16} /> Continue
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Bible download ─────────────────────── */}
        {step === "bible" && (
          <div className="flex flex-col gap-5 px-6 pb-6 pt-2">
            <div className="text-center">
              <h2 className="font-display text-xl font-bold">Download Bibles</h2>
              <p className="text-muted mt-1 text-sm">
                Save KJV & WEB for offline study
              </p>
            </div>

            {LOCAL_TRANSLATIONS.map((t) => {
              const isActive = dlProgress?.status === "downloading";
              return (
                <div key={t.id} className="card card-surface">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{t.fullName}</p>
                      <p className="text-muted text-[12px]">{t.name} · Public domain</p>
                    </div>
                    {dlDone ? (
                      <span className="flex items-center gap-1 text-[12px] font-semibold text-emerald-500">
                        <CheckCircle2 size={14} /> Saved
                      </span>
                    ) : (
                      <button
                        disabled={isActive || !navigator.onLine}
                        onClick={() => {
                          const ctrl = new AbortController();
                          abortRef.current = ctrl;
                          downloadTranslation(t.id, setDlProgress, ctrl.signal)
                            .then(() => setDlDone(true))
                            .catch(() => {});
                        }}
                        className="btn-primary !py-1.5 !px-3 text-xs disabled:opacity-30"
                      >
                        <Download size={13} /> Download
                      </button>
                    )}
                  </div>
                  {dlProgress && dlProgress.status === "downloading" && (
                    <>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full bg-gold-500 transition-all duration-300"
                          style={{ width: `${Math.round((dlProgress.done / dlProgress.total) * 100)}%` }}
                        />
                      </div>
                      <p className="text-muted mt-1 text-[11px]">
                        {dlProgress.currentBook}… {dlProgress.done}/{dlProgress.total}
                      </p>
                    </>
                  )}
                </div>
              );
            })}

            {!navigator.onLine && (
              <p className="text-amber-500 text-center text-[12px]">
                Connect to the internet to download.
              </p>
            )}

            <p className="text-muted text-center text-[11px]">
              Downloads continue in the background. You can skip and download later from the Bible tab.
            </p>

            <button onClick={() => setStep("ai")} className="btn-primary w-full">
              <ChevronRight size={16} />{" "}
              {dlProgress?.status === "downloading" ? "Continue (downloading…)" : "Continue"}
            </button>
          </div>
        )}

        {/* ── STEP 4: AI setup (optional) ────────────────── */}
        {step === "ai" && (
          <div className="flex flex-col gap-5 px-6 pb-6 pt-2">
            <div className="text-center">
              <h2 className="font-display text-xl font-bold">AI Study Assistant</h2>
              <p className="text-muted mt-1 text-sm">
                Connect an AI to help you understand Scripture
              </p>
            </div>

            <div className="card card-gold">
              <p className="text-[13px] leading-relaxed text-secondary">
                Each study question has an{" "}
                <strong className="text-gold-500">"Ask AI"</strong> button that
                explains verses, expands on your thoughts, and gives Bible
                references — all in plain English.
              </p>
            </div>

            <p className="text-muted text-[12px] leading-relaxed">
              You'll need a free API key from one of our providers. You can set
              this up now or later when you first tap "Ask AI" in a study.
            </p>

            <div className="flex gap-3">
              <button onClick={handleFinish} className="btn-secondary flex-1">
                Skip for now
              </button>
              <button
                onClick={() => setShowAISetup(true)}
                className="btn-primary flex-1"
              >
                <Sparkles size={16} /> Set Up AI
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Notification scheduling                                           */
/* ================================================================== */

let _reminderTimeout: ReturnType<typeof setTimeout> | null = null;
let _reminderInterval: ReturnType<typeof setInterval> | null = null;

function scheduleReminder(time: string) {
  if (_reminderTimeout) clearTimeout(_reminderTimeout);
  if (_reminderInterval) clearInterval(_reminderInterval);

  if (!("serviceWorker" in navigator) || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const [hours, minutes] = time.split(":").map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(hours, minutes, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delay = next.getTime() - now.getTime();

  _reminderTimeout = setTimeout(() => {
    showStudyNotification();
    _reminderInterval = setInterval(showStudyNotification, 24 * 60 * 60 * 1000);
  }, delay);
}

function showStudyNotification() {
  try {
    const { getTodayStudy, getDayNumber } = useAppStore.getState();
    const study = getTodayStudy();
    const day = getDayNumber();
    if (!study) return;

    const url = `${window.location.origin}${import.meta.env.BASE_URL}study/${study.id}`;
    const notif = new Notification(`Day ${day}: ${study.title}`, {
      body: "Time for your daily Bible study!",
      icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
      tag: "daily-study",
    });
    notif.onclick = () => {
      window.focus();
      window.location.href = url;
      notif.close();
    };
  } catch {
    // Notification failed — silently ignore
  }
}
