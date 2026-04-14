import { useState } from "react";
import { X, Eye, EyeOff, ExternalLink, Sparkles } from "lucide-react";
import { useTheme } from "@/components/ui/ThemeProvider";
import { cn } from "@/lib/utils";
import {
  PROVIDERS,
  getStoredKey,
  storeKey,
  storeProvider,
  type ProviderId,
} from "@/lib/aiProvider";

interface Props {
  onComplete: (providerId: ProviderId) => void;
  onSkip?: () => void;
}

export function AIKeySetup({ onComplete, onSkip }: Props) {
  const { isDark } = useTheme();
  const [selected, setSelected] = useState<ProviderId>("groq");
  const [key, setKey] = useState(() => getStoredKey("groq") ?? "");
  const [showKey, setShowKey] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");

  const provider = PROVIDERS.find((p) => p.id === selected)!;

  const handleSelect = (id: ProviderId) => {
    setSelected(id);
    setKey(getStoredKey(id) ?? "");
    setError("");
  };

  const handleConnect = () => {
    const trimmed = key.trim();
    if (!trimmed) { setError("Please paste your API key"); return; }
    if (remember) storeKey(selected, trimmed);
    storeProvider(selected);
    onComplete(selected);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" />

      <div className={cn(
        "relative z-10 w-full max-w-md animate-slide-up",
        "flex max-h-[90dvh] flex-col overflow-y-auto",
        "rounded-t-3xl sm:rounded-3xl safe-bottom",
        isDark ? "bg-navy-700" : "bg-elevated",
      )}>
        <div className="flex justify-center py-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-muted opacity-30" />
        </div>

        <div className="flex flex-col gap-5 px-6 pb-6 pt-2">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-xl font-bold">Connect AI</h2>
              <p className="text-muted mt-1 text-sm">
                Choose a provider and paste your API key
              </p>
            </div>
            {onSkip && (
              <button onClick={onSkip} className="rounded-full p-2 bg-surface active:opacity-70" aria-label="Close">
                <X size={16} className="text-muted" />
              </button>
            )}
          </div>

          <p className="text-muted text-[11px] leading-relaxed">
            Your key is stored only on your device and sent directly to the provider you choose. We never see it.
          </p>

          {/* Provider selection */}
          <div>
            <p className="text-2xs font-bold uppercase tracking-caps text-gold-500 mb-2">1 — Choose a provider</p>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p.id)}
                  className={cn(
                    "card card-surface card-interactive flex flex-col items-center gap-1 py-3 text-center",
                    selected === p.id && "ring-2 ring-gold-500/40 bg-gold-500/5",
                  )}
                >
                  <span className="text-lg">{p.emoji}</span>
                  <span className="text-sm font-semibold">{p.name}</span>
                  <span className="text-muted text-2xs">{p.model.split("/").pop()?.split(":")[0]}</span>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-2xs font-bold",
                    p.tier === "free" ? "bg-emerald-500/15 text-emerald-500" : "bg-gold-500/10 text-gold-500",
                  )}>
                    {p.tier === "free" ? "Free tier" : "Paid key"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* API key input */}
          <div>
            <p className="text-2xs font-bold uppercase tracking-caps text-gold-500 mb-2">2 — Paste your API key</p>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={key}
                onChange={(e) => { setKey(e.target.value); setError(""); }}
                placeholder="sk-..."
                className="input pr-10 font-mono text-sm"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              >
                {showKey ? <EyeOff size={14} className="text-muted" /> : <Eye size={14} className="text-muted" />}
              </button>
            </div>

            <a
              href={provider.keyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center gap-1 text-[11px] text-gold-500 hover:underline"
            >
              <ExternalLink size={10} /> {provider.keyHint}
            </a>

            {error && <p className="mt-1 text-red-400 text-xs">{error}</p>}
          </div>

          {/* Remember toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-theme accent-gold-500"
            />
            <span className="text-sm text-secondary">Remember my key on this device</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3">
            {onSkip && (
              <button onClick={onSkip} className="btn-secondary flex-1">
                Skip
              </button>
            )}
            <button onClick={handleConnect} className="btn-primary flex-1">
              <Sparkles size={16} /> Connect & Start
            </button>
          </div>

          <p className="text-muted text-center text-[10px]">
            Keys stored locally only · Never sent to our servers
          </p>
        </div>
      </div>
    </div>
  );
}
