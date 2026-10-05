/* ================================================================== */
/*  DictationButton — mic control matching chat/search icon buttons.  */
/*  Hidden when neither Capacitor speech nor Web Speech is available. */
/* ================================================================== */

import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDictation, type UseDictationOptions } from "@/hooks/useDictation";

export interface DictationButtonProps extends UseDictationOptions {
  className?: string;
  /** Visual size; default matches the AI chat send button (h-10 w-10). */
  size?: "md" | "sm";
}

export function DictationButton({
  className,
  size = "md",
  ...opts
}: DictationButtonProps) {
  const { ready, available, listening, toggle } = useDictation(opts);

  if (!ready || !available) return null;

  const dim = size === "sm" ? "h-9 w-9 min-h-9 min-w-9" : "h-10 w-10 min-h-11 min-w-11";
  const icon = size === "sm" ? 15 : 16;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={listening ? "Stop dictation" : "Dictate"}
      aria-pressed={listening}
      title={listening ? "Listening… tap to stop" : "Dictate"}
      className={cn(
        "inline-flex items-center justify-center rounded-xl transition-colors",
        "active:scale-[0.93] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40",
        dim,
        listening
          ? "bg-red-500/20 text-red-400 animate-pulse"
          : "bg-surface text-muted hover:text-primary active:opacity-70",
        className,
      )}
    >
      {listening ? <Square size={icon - 1} fill="currentColor" /> : <Mic size={icon} />}
      {listening && (
        <span className="sr-only">Listening…</span>
      )}
    </button>
  );
}

/** Absolute-positioned mic for search bars (sits in the right padding). */
export function DictationButtonAbsolute({
  className,
  ...opts
}: DictationButtonProps) {
  return (
    <DictationButton
      {...opts}
      size="sm"
      className={cn("absolute right-1.5 top-1/2 z-10 -translate-y-1/2", className)}
    />
  );
}
