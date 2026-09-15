import { CheckCircle2, Shield, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ui/ThemeProvider";
import { clearDeepSeekKey, isAIReady } from "@/lib/aiProvider";
import { useEffect } from "react";

interface AIKeySetupProps {
  onComplete?: () => void;
  onSkip?: () => void;
  /** When true renders as a full-screen modal (default).
   *  When false renders inline (for the More/Settings page). */
  inline?: boolean;
}

/**
 * Legacy name kept for call sites. AI no longer needs a browser API key —
 * requests go through a secure server proxy.
 */
export function AIKeySetup({ onComplete, onSkip, inline = false }: AIKeySetupProps) {
  const { isDark } = useTheme();
  const ready = isAIReady();

  useEffect(() => {
    // Drop any legacy key from older builds so it cannot leak.
    clearDeepSeekKey();
  }, []);

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
        <div>
          <h2 className="font-display text-xl font-bold">AI Study Assistant</h2>
          <p className="text-muted text-[13px] mt-0.5">
            Ready to help with Scripture questions
          </p>
        </div>
        {!inline && onSkip && (
          <button
            onClick={onSkip}
            className="p-2 rounded-full text-muted hover:text-secondary hover:bg-surface transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="mx-5 mb-3 rounded-xl bg-gold-500/10 border border-gold-500/20 px-4 py-3 flex-shrink-0">
        <p className="text-[12px] text-gold-400 leading-relaxed flex gap-2">
          <Shield size={14} className="shrink-0 mt-0.5" />
          <span>
            <strong>AI runs via a secure server proxy.</strong> No API key is
            stored or entered in your browser.
          </span>
        </p>
      </div>

      <div
        className="flex-1 overflow-y-auto px-5 space-y-4 pb-4"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        <div
          className={cn(
            "rounded-2xl border p-4",
            ready
              ? "border-gold-500/50 bg-gold-500/5"
              : isDark
                ? "border-white/8 bg-navy-800/60"
                : "border-black/8 bg-white/60",
          )}
        >
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-sm font-bold">Ask AI</span>
            {ready && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                <CheckCircle2 size={11} /> Ready
              </span>
            )}
          </div>
          <p className="text-[12px] text-secondary leading-relaxed">
            Use Normal, Deep, or Explanatory mode from Ask AI. Answers are
            grounded in Scripture and Adventist teaching.
          </p>
        </div>
      </div>

      {!inline && (
        <div
          className="flex gap-3 px-5 py-4 border-t border-white/8 flex-shrink-0"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)" }}
        >
          {onSkip && (
            <button onClick={onSkip} className="btn-secondary flex-1">
              Close
            </button>
          )}
          <button
            onClick={() => onComplete?.()}
            disabled={!ready}
            className={cn(
              "btn-primary flex-1",
              !ready && "opacity-40 cursor-not-allowed",
            )}
          >
            {ready ? "Done" : "Unavailable"}
          </button>
        </div>
      )}
    </div>
  );

  if (inline) {
    return (
      <div
        className={cn(
          "rounded-2xl overflow-hidden flex flex-col",
          isDark ? "bg-navy-700" : "bg-elevated",
        )}
        style={{ maxHeight: "80dvh" }}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="absolute inset-0 bg-black/80" />
      <div
        className={cn(
          "relative z-10 flex flex-col w-full h-full",
          "sm:max-w-lg sm:mx-auto sm:my-auto sm:rounded-3xl sm:h-auto sm:max-h-[90dvh]",
          isDark ? "bg-navy-700" : "bg-elevated",
        )}
      >
        {content}
      </div>
    </div>
  );
}
