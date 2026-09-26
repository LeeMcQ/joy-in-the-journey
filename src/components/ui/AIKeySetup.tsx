import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ui/ThemeProvider";
import { clearDeepSeekKey } from "@/lib/aiProvider";
import { useAIProvider } from "@/hooks/useAIProvider";
import { AIProviderSettings } from "@/components/ui/AIProviderSettings";
import { useEffect } from "react";

interface AIKeySetupProps {
  onComplete?: () => void;
  onSkip?: () => void;
  /** When true renders as a full-screen modal (default).
   *  When false renders inline (for the More/Settings page). */
  inline?: boolean;
}

/**
 * Legacy name kept for call sites. Wraps the AI provider picker
 * (Joy in the Journey server, or bring your own key).
 */
export function AIKeySetup({ onComplete, onSkip, inline = false }: AIKeySetupProps) {
  const { isDark } = useTheme();
  const { hasKey: ready } = useAIProvider();

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
            Choose the AI that answers your questions
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

      <div
        className="flex-1 overflow-y-auto px-5 pb-4"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        <AIProviderSettings />
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
            {ready ? "Done" : "Save a key first"}
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
