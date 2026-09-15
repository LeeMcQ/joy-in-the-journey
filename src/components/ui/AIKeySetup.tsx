import { useState } from "react";
import {
  X,
  CheckCircle2,
  ExternalLink,
  Key,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ui/ThemeProvider";
import {
  getDeepSeekKey,
  storeDeepSeekKey,
  clearDeepSeekKey,
  hasDeepSeekKey,
} from "@/lib/aiProvider";

const KEY_URL = "https://platform.deepseek.com/api_keys";

interface AIKeySetupProps {
  onComplete?: (providerId?: string) => void;
  onSkip?: () => void;
  /** When true renders as a full-screen modal (default).
   *  When false renders inline (for the More/Settings page). */
  inline?: boolean;
}

export function AIKeySetup({ onComplete, onSkip, inline = false }: AIKeySetupProps) {
  const { isDark } = useTheme();
  const [keyValue, setKeyValue] = useState(() => getDeepSeekKey() ?? "");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(() => hasDeepSeekKey());

  const handleSave = () => {
    const trimmed = keyValue.trim();
    if (!trimmed) return;
    storeDeepSeekKey(trimmed);
    setSaved(true);
    onComplete?.("deepseek");
  };

  const handleClear = () => {
    clearDeepSeekKey();
    setKeyValue("");
    setSaved(false);
  };

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
        <div>
          <h2 className="font-display text-xl font-bold">AI Study Assistant</h2>
          <p className="text-muted text-[13px] mt-0.5">
            Add your DeepSeek API key to chat
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
        <p className="text-[12px] text-gold-400 leading-relaxed">
          <strong>Your key is stored only on your device.</strong> It is sent
          directly to DeepSeek when you ask a question — never to our servers.
        </p>
      </div>

      <div
        className="flex-1 overflow-y-auto px-5 space-y-4 pb-4"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        <div
          className={cn(
            "rounded-2xl border p-4",
            saved
              ? "border-gold-500/50 bg-gold-500/5"
              : isDark
                ? "border-white/8 bg-navy-800/60"
                : "border-black/8 bg-white/60",
          )}
        >
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="text-sm font-bold">DeepSeek</span>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              API KEY
            </span>
            {saved && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                <CheckCircle2 size={11} /> Key saved
              </span>
            )}
          </div>

          <p className="text-[12px] text-secondary leading-relaxed mb-3">
            Get a key at platform.deepseek.com — pay-as-you-go, typically very
            affordable for study chat.
          </p>

          <ol className="space-y-2 mb-4">
            {[
              "Open platform.deepseek.com and sign in",
              'Go to "API Keys" and create a new key',
              "Copy the key and paste it below",
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-[12px]">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-500/20 text-gold-400 text-[10px] font-bold mt-0.5">
                  {i + 1}
                </span>
                <span className="text-secondary leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>

          <a
            href={KEY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[12px] font-semibold text-gold-400 hover:text-gold-300 transition-colors mb-4"
          >
            <ExternalLink size={13} />
            Open DeepSeek API keys
          </a>

          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
              Paste your API key
            </p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Key
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  type={showKey ? "text" : "password"}
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                  }}
                  placeholder="sk-…"
                  className={cn(
                    "w-full rounded-xl border pl-9 pr-10 py-3 text-[13px] font-mono",
                    "outline-none transition-all",
                    isDark
                      ? "bg-navy-900/60 border-white/10 text-white placeholder:text-white/30 focus:border-gold-500/40 focus:ring-2 focus:ring-gold-500/10"
                      : "bg-white border-black/10 text-gray-900 placeholder:text-gray-400 focus:border-gold-500/40 focus:ring-2 focus:ring-gold-500/10",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors"
                  aria-label={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              <button
                onClick={handleSave}
                disabled={!keyValue.trim()}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-4 py-3 text-[13px] font-bold transition-all flex-shrink-0",
                  keyValue.trim()
                    ? "bg-gold-500 text-navy-900 hover:bg-gold-400 active:scale-95"
                    : "bg-surface text-muted cursor-not-allowed opacity-50",
                )}
              >
                {saved && keyValue.trim() ? (
                  <CheckCircle2 size={14} className="text-navy-900" />
                ) : (
                  <Key size={14} />
                )}
                Save
              </button>
            </div>

            {saved && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <p className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <CheckCircle2 size={12} />
                  Key saved on this device
                </p>
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-red-400 transition-colors"
                >
                  <Trash2 size={11} />
                  Clear key
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {!inline && (
        <div
          className="flex gap-3 px-5 py-4 border-t border-white/8 flex-shrink-0"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)" }}
        >
          {onSkip && (
            <button onClick={onSkip} className="btn-secondary flex-1">
              Skip for now
            </button>
          )}
          <button
            onClick={() => onComplete?.("deepseek")}
            disabled={!saved}
            className={cn(
              "btn-primary flex-1",
              !saved && "opacity-40 cursor-not-allowed",
            )}
          >
            {saved ? "Done" : "Add a key first"}
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
