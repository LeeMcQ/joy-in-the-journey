/* ================================================================== */
/*  Bible Language Manager                                            */
/*  - Shows all 4 translations with install status                   */
/*  - Handles install / uninstall with progress                      */
/*  - Warns about unavailable translations                           */
/* ================================================================== */

import { useState, useEffect, useRef } from "react";
import {
  Download,
  CheckCircle2,
  Trash2,
  Loader2,
  AlertCircle,
  Lock,
  HardDrive,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/Toast";
import {
  TRANSLATIONS,
  installTranslation,
  uninstallTranslation,
  isTranslationInstalled,
  getStorageEstimate,
  type InstallProgress,
} from "@/lib/bibleDB";

interface TranslationState {
  translationId: string;
  installed: boolean;
  progress: InstallProgress | null;
  installing: boolean;
  error: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function BibleLanguageManager() {
  const [states, setStates] = useState<TranslationState[]>(
    TRANSLATIONS.map((t) => ({
      translationId: t.id,
      installed: false,
      progress: null,
      installing: false,
      error: null,
    }))
  );
  const [storage, setStorage] = useState<{ used: number; quota: number } | null>(null);
  const abortRefs = useRef<Map<string, AbortController>>(new Map());

  // Load install states on mount
  useEffect(() => {
    Promise.all(TRANSLATIONS.map((t) => isTranslationInstalled(t.id))).then(
      (results) => {
        setStates((prev) =>
          prev.map((s, i) => ({ ...s, installed: results[i] }))
        );
      }
    );
    getStorageEstimate().then(setStorage);
  }, []);

  const updateState = (id: string, patch: Partial<TranslationState>) =>
    setStates((prev) => prev.map((s) => (s.translationId === id ? { ...s, ...patch } : s)));

  const handleInstall = async (translationId: string) => {
    const meta = TRANSLATIONS.find((t) => t.id === translationId);
    if (!meta?.available) return;

    const ctrl = new AbortController();
    abortRefs.current.set(translationId, ctrl);
    updateState(translationId, { installing: true, error: null, progress: null });

    try {
      await installTranslation(
        translationId,
        (p) => updateState(translationId, { progress: p }),
        ctrl.signal
      );
      updateState(translationId, { installed: true, installing: false, progress: null });
      showToast(`${meta.language} Bible installed!`, { type: "success" });
      const est = await getStorageEstimate();
      if (est) setStorage(est);
    } catch (err) {
      if ((err as Error).message === "Cancelled") {
        updateState(translationId, { installing: false, progress: null, error: null });
      } else {
        const msg = (err as Error).message ?? "Installation failed";
        updateState(translationId, { installing: false, progress: null, error: msg });
      }
    } finally {
      abortRefs.current.delete(translationId);
    }
  };

  const handleCancel = (translationId: string) => {
    abortRefs.current.get(translationId)?.abort();
  };

  const handleUninstall = async (translationId: string) => {
    const meta = TRANSLATIONS.find((t) => t.id === translationId);
    if (!confirm(`Remove ${meta?.language} Bible from device?`)) return;

    updateState(translationId, { installing: true, error: null });
    try {
      await uninstallTranslation(translationId);
      updateState(translationId, { installed: false, installing: false });
      showToast(`${meta?.language} Bible removed`, { type: "info" });
      const est = await getStorageEstimate();
      if (est) setStorage(est);
    } catch (err) {
      updateState(translationId, {
        installing: false,
        error: (err as Error).message ?? "Removal failed",
      });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Storage indicator */}
      {storage && storage.quota > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2">
          <HardDrive size={13} className="text-muted shrink-0" />
          <div className="flex-1">
            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gold-500/60 transition-all"
                style={{ width: `${Math.min((storage.used / storage.quota) * 100, 100)}%` }}
              />
            </div>
          </div>
          <span className="text-muted text-[11px] shrink-0">
            {formatBytes(storage.used)} / {formatBytes(storage.quota)} used
          </span>
        </div>
      )}

      {/* Translation cards */}
      {TRANSLATIONS.map((t) => {
        const state = states.find((s) => s.translationId === t.id)!;
        const pct = state.progress
          ? state.progress.total > 0
            ? Math.round((state.progress.done / state.progress.total) * 100)
            : 0
          : 0;

        return (
          <div
            key={t.id}
            className={cn(
              "rounded-2xl border p-4 transition-all",
              state.installed
                ? "border-gold-500/20 bg-gold-500/[0.03]"
                : t.available
                ? "border-white/8 bg-surface"
                : "border-white/5 bg-surface/50 opacity-70",
            )}
          >
            <div className="flex items-start gap-3">
              {/* Language flag / icon */}
              <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg",
                state.installed ? "bg-gold-500/10" : "bg-white/5",
              )}>
                {t.languageCode === "af" && "🇿🇦"}
                {t.languageCode === "xh" && "✦"}
                {t.languageCode === "zu" && "🌿"}
                {t.languageCode === "st" && "🏔️"}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">{t.language}</p>
                  <span className="rounded-full bg-white/8 px-2 py-0.5 font-mono text-[10px] text-muted">
                    {t.id}
                  </span>
                  {!t.available && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                      <Lock size={9} /> Copyright
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[12px] text-muted">{t.fullName}</p>

                {/* Progress bar */}
                {state.installing && state.progress && (
                  <div className="mt-2">
                    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gold-500 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted">
                      {state.progress.phase === "fetching" && "Downloading…"}
                      {state.progress.phase === "importing" && `Importing ${state.progress.book ?? ""}… ${pct}%`}
                      {state.progress.phase === "indexing" && `Building search index… ${pct}%`}
                    </p>
                  </div>
                )}

                {/* Error */}
                {state.error && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-red-400">
                    <AlertCircle size={11} /> {state.error}
                  </p>
                )}

                {/* Unavailable note */}
                {!t.available && t.note && (
                  <p className="mt-1 text-[11px] leading-relaxed text-amber-500/70">
                    {t.note}
                  </p>
                )}
              </div>

              {/* Action button */}
              <div className="shrink-0">
                {!t.available ? (
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-muted">
                    <Lock size={15} />
                  </div>
                ) : state.installing ? (
                  <button
                    onClick={() => handleCancel(t.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-400 active:opacity-70"
                  >
                    <Loader2 size={15} className="animate-spin" />
                  </button>
                ) : state.installed ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleInstall(t.id)}
                      title="Re-install"
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-muted active:opacity-70"
                    >
                      <RefreshCw size={13} />
                    </button>
                    <button
                      onClick={() => handleUninstall(t.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-muted active:opacity-70 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleInstall(t.id)}
                    disabled={!navigator.onLine}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-500/15 text-gold-500 active:opacity-70 disabled:opacity-30"
                    title={navigator.onLine ? `Install ${t.language}` : "Connect to internet to download"}
                  >
                    <Download size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Installed badge */}
            {state.installed && !state.installing && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-500">
                <CheckCircle2 size={12} />
                Ready offline · full-text search enabled
              </div>
            )}
          </div>
        );
      })}

      <p className="text-center text-[11px] text-muted px-2">
        Installed Bibles work fully offline. Search is available across all installed translations simultaneously.
      </p>
    </div>
  );
}
