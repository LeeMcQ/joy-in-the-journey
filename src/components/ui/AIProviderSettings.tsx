import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, Eye, EyeOff, Loader2, Lock, Server, Trash2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/Toast";
import { useAIProvider } from "@/hooks/useAIProvider";
import { testServer } from "@/lib/aiProvider";
import { useTheme } from "@/components/ui/ThemeProvider";
import {
  PROVIDERS,
  PROVIDER_ORDER,
  SERVER_OPTION,
  clearStoredKey,
  firstProviderWithKey,
  getStoredKey,
  hasValidStoredKey,
  keyPlaceholder,
  looksLikeKey,
  setActiveProvider,
  setStoredKey,
  testProvider,
  type ActiveProviderId,
  type HintPart,
} from "@/lib/llmProviders";

type Status = { kind: "ok" | "error" | "info"; text: string } | null;

function Hint({ parts }: { parts: HintPart[] }) {
  return (
    <>
      {parts.map((p, i) => {
        if (typeof p === "string") return <span key={i}>{p}</span>;
        if ("strong" in p) return <strong key={i} className="text-secondary">{p.strong}</strong>;
        return (
          <a
            key={i}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-gold-accessible underline underline-offset-2"
          >
            {p.text}
            <ExternalLink size={10} className="ml-0.5 inline align-baseline" />
          </a>
        );
      })}
    </>
  );
}

/**
 * AI provider picker — bring your own key.
 * Cards for the Joy in the Journey server + each provider; the key is saved
 * only in this device's localStorage and sent straight to the provider.
 */
export function AIProviderSettings() {
  const { active } = useAIProvider();
  const { isDark } = useTheme();
  const [selected, setSelected] = useState<ActiveProviderId>(active);
  const [keyInput, setKeyInput] = useState(() => (active === "server" ? "" : getStoredKey(active)));
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [testing, setTesting] = useState(false);
  // Re-render card badges after save/remove.
  const [, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const select = (id: ActiveProviderId) => {
    abortRef.current?.abort();
    setTesting(false);
    setSelected(id);
    setShowKey(false);
    setStatus(null);
    if (id === "server") {
      setKeyInput("");
      setActiveProvider("server");
      return;
    }
    const saved = getStoredKey(id);
    setKeyInput(saved);
    // A provider with a saved key becomes active straight away; otherwise it
    // becomes active once a key is saved.
    if (looksLikeKey(id, saved)) {
      setActiveProvider(id);
    } else {
      setStatus({ kind: "info", text: `Paste your ${PROVIDERS[id].name} key and tap Save to use it.` });
    }
  };

  const save = () => {
    if (selected === "server") return;
    const p = PROVIDERS[selected];
    const key = keyInput.trim();
    if (!key) {
      setStatus({ kind: "error", text: "Please paste your API key first." });
      return;
    }
    if (!looksLikeKey(selected, key)) {
      setStatus({
        kind: "error",
        text: `That doesn't look like a ${p.name} key. Expected format: ${keyPlaceholder(selected)}`,
      });
      return;
    }
    setStoredKey(selected, key);
    setActiveProvider(selected);
    setKeyInput(key);
    setShowKey(false);
    setTick((t) => t + 1);
    setStatus({ kind: "ok", text: `Saved on this device. Ask AI now uses ${p.name} (${p.modelLabel}).` });
    showToast(`AI provider: ${p.name}`, { type: "success" });
  };

  const remove = () => {
    if (selected === "server") return;
    const p = PROVIDERS[selected];
    clearStoredKey(selected);
    setKeyInput("");
    setTick((t) => t + 1);
    let fallbackNote = "";
    if (active === selected) {
      const next = firstProviderWithKey(selected) ?? "server";
      setActiveProvider(next);
      fallbackNote = ` Ask AI now uses ${next === "server" ? SERVER_OPTION.name : PROVIDERS[next].name}.`;
    }
    setStatus({ kind: "info", text: `${p.name} key removed from this device.${fallbackNote}` });
  };

  const test = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setTesting(true);
    setStatus(null);
    try {
      if (selected === "server") {
        const { text, ms } = await testServer(controller.signal);
        setStatus({ kind: "ok", text: `Server replied in ${(ms / 1000).toFixed(1)}s: “${text}”` });
      } else {
        const p = PROVIDERS[selected];
        const typed = keyInput.trim();
        if (!typed && !hasValidStoredKey(selected)) {
          setStatus({ kind: "error", text: `Paste your ${p.name} key first.` });
          return;
        }
        if (typed && !looksLikeKey(selected, typed)) {
          setStatus({ kind: "error", text: `That doesn't look like a ${p.name} key. Expected format: ${keyPlaceholder(selected)}` });
          return;
        }
        const { text, ms } = await testProvider(selected, typed || undefined, controller.signal);
        const unsaved = typed && typed !== getStoredKey(selected);
        setStatus({
          kind: "ok",
          text: `${p.name} replied in ${(ms / 1000).toFixed(1)}s: “${text}”.${unsaved ? " Tap Save to keep this key." : ""}`,
        });
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setStatus({ kind: "error", text: e instanceof Error ? e.message : "Test failed." });
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setTesting(false);
      }
    }
  };

  const spec = selected === "server" ? null : PROVIDERS[selected];
  const savedKey = selected === "server" ? "" : getStoredKey(selected);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] leading-relaxed text-muted">
        Choose which AI answers <span className="font-semibold text-secondary">Ask AI</span>. Bring your own key:
        paste it once and your questions go straight from this device to the provider.
      </p>

      {/* Provider cards — 2 columns, 1 column on very narrow phones */}
      <div role="radiogroup" aria-label="AI provider" className="grid grid-cols-2 gap-2 max-[359px]:grid-cols-1">
        <ProviderCard
          id="server"
          name={SERVER_OPTION.name}
          model={SERVER_OPTION.modelLabel}
          badge={{ text: "No key", tone: "free" }}
          active={active === "server"}
          selected={selected === "server"}
          saved={false}
          onSelect={select}
        />
        {PROVIDER_ORDER.map((id) => {
          const p = PROVIDERS[id];
          return (
            <ProviderCard
              key={id}
              id={id}
              name={p.name}
              model={p.modelLabel}
              badge={{ text: p.tier === "free" ? "Free tier" : "Paid key", tone: p.tier }}
              recommended={p.recommended}
              active={active === id}
              selected={selected === id}
              saved={hasValidStoredKey(id)}
              onSelect={select}
            />
          );
        })}
      </div>

      {/* Detail panel for the selected card */}
      <div className="flex flex-col gap-3 rounded-xl border border-theme bg-elevated p-3">
        {spec ? (
          <>
            <div>
              <p className="text-sm font-semibold text-primary">{spec.label}</p>
              <p className="font-mono text-[11px] text-muted">{spec.model}</p>
            </div>
            <p className="text-[12px] leading-relaxed text-muted">
              <Hint parts={spec.hint} />
            </p>

            <label className="flex flex-col gap-1.5">
              <span className="text-2xs font-bold uppercase tracking-caps text-muted">API key</span>
              <div className="flex items-stretch gap-2">
                <input
                  type={showKey ? "text" : "password"}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") save(); }}
                  placeholder={keyPlaceholder(spec.id)}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="input min-h-11 min-w-0 flex-1 font-mono !text-[13px]"
                  aria-label={`${spec.name} API key`}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-surface text-muted active:opacity-70"
                  aria-label={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={save} className="btn-primary min-h-11 !px-2">
                Save
              </button>
              <button type="button" onClick={test} disabled={testing} className="btn-secondary min-h-11 !px-2 disabled:opacity-50">
                {testing ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />} Test
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={!savedKey}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-red-500/25 px-2 text-sm font-medium text-red-400 active:bg-red-500/10 disabled:opacity-30"
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Server size={15} className="text-gold-500" />
              <p className="text-sm font-semibold text-primary">{SERVER_OPTION.name}</p>
            </div>
            <p className="text-[12px] leading-relaxed text-muted">
              Uses the shared Joy in the Journey AI server — no key needed. If it is busy or unavailable, pick
              Gemini (free) or another provider above and paste your own key.
            </p>
            <button type="button" onClick={test} disabled={testing} className="btn-secondary min-h-11 w-full disabled:opacity-50">
              {testing ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />} Test server
            </button>
          </>
        )}

        <div aria-live="polite" className="empty:hidden">
          {status && (
            <p
              className={cn(
                "rounded-lg px-3 py-2 text-[12px] leading-relaxed",
                status.kind === "ok" && cn("bg-emerald-500/10", isDark ? "text-emerald-400" : "text-emerald-700"),
                status.kind === "error" && "bg-red-500/10 text-red-500",
                status.kind === "info" && "bg-gold-500/10 text-gold-accessible",
              )}
            >
              {status.text}
            </p>
          )}
        </div>
      </div>

      <p className="flex gap-2 text-[11px] leading-relaxed text-muted">
        <Lock size={12} className="mt-0.5 shrink-0 text-gold-500" />
        <span>
          Your key stays on this device only. It is saved in this browser’s storage and sent only to the provider you
          choose — never to Joy in the Journey. Remove it any time.
        </span>
      </p>
    </div>
  );
}

function ProviderCard({
  id,
  name,
  model,
  badge,
  recommended,
  active,
  selected,
  saved,
  onSelect,
}: {
  id: ActiveProviderId;
  name: string;
  model: string;
  badge: { text: string; tone: "free" | "paid" };
  recommended?: boolean;
  active: boolean;
  selected: boolean;
  saved: boolean;
  onSelect: (id: ActiveProviderId) => void;
}) {
  const { isDark } = useTheme();
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(id)}
      className={cn(
        "relative flex min-h-[44px] flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition-all active:scale-[0.98]",
        selected ? "border-gold-500 bg-gold-500/10" : "border-transparent bg-elevated",
      )}
    >
      <span className="flex w-full items-start justify-between gap-1">
        <span className="text-[13px] font-bold leading-tight text-primary">{name}</span>
        {active && (
          <CheckCircle2 size={15} className="shrink-0 text-gold-500" aria-label="In use" />
        )}
      </span>
      <span className="w-full truncate font-mono text-[10px] text-muted">{model}</span>
      <span className="mt-0.5 flex flex-wrap gap-1">
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
            badge.tone === "free"
              ? cn("bg-emerald-500/15", isDark ? "text-emerald-400" : "text-emerald-700")
              : "bg-gold-500/15 text-gold-accessible",
          )}
        >
          {badge.text}
        </span>
        {recommended && (
          <span className="rounded-full bg-gold-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-navy-900">
            Recommended
          </span>
        )}
        {saved && (
          <span className="rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-secondary">
            Key saved
          </span>
        )}
      </span>
    </button>
  );
}
