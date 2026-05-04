import { useState } from "react";
import {
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ExternalLink,
  Key,
  Sparkles,
  Eye,
  EyeOff,
  Zap,
  Globe,
  Brain,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ui/ThemeProvider";

/* ────────────────────────────────────────────────────────────────────
   Provider definitions — 8 providers, free ones first
──────────────────────────────────────────────────────────────────── */

type ProviderId =
  | "groq"
  | "openrouter"
  | "gemini"
  | "mistral"
  | "claude"
  | "chatgpt"
  | "cohere"
  | "perplexity";

interface ProviderDef {
  id: ProviderId;
  name: string;
  model: string;
  tier: "free" | "freemium" | "paid";
  tagline: string;
  icon: typeof Zap;
  iconColor: string;
  keyUrl: string;
  storageKey: string;
  steps: string[];
  note?: string;
}

const PROVIDERS: ProviderDef[] = [
  {
    id: "groq",
    name: "Groq",
    model: "llama-3.3-70b-versatile",
    tier: "free",
    tagline: "Free · Lightning fast · No credit card needed",
    icon: Zap,
    iconColor: "text-yellow-400",
    keyUrl: "https://console.groq.com/keys",
    storageKey: "joy-ai-key-groq",
    steps: [
      "Go to console.groq.com and click Sign Up",
      "Create a free account with your email",
      'In the left sidebar click "API Keys"',
      'Click "Create API Key", give it a name',
      "Copy the key (starts with gsk_…) and paste below",
    ],
    note: "Groq is completely free with generous limits — best starting point.",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    model: "meta-llama/llama-3.1-8b-instruct:free",
    tier: "free",
    tagline: "Free tier available · Many models · No credit card needed",
    icon: Globe,
    iconColor: "text-blue-400",
    keyUrl: "https://openrouter.ai/keys",
    storageKey: "joy-ai-key-openrouter",
    steps: [
      "Go to openrouter.ai and click Sign In",
      "Create a free account",
      'Click your profile icon → "Keys"',
      'Click "Create Key" and give it a name',
      "Copy the key (starts with sk-or-…) and paste below",
    ],
    note: "Free models available. Select free models to avoid any charges.",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    model: "gemini-1.5-flash",
    tier: "free",
    tagline: "Free tier · Google AI · No credit card needed",
    icon: Star,
    iconColor: "text-sky-400",
    keyUrl: "https://aistudio.google.com/app/apikey",
    storageKey: "joy-ai-key-gemini",
    steps: [
      "Go to aistudio.google.com and sign in with your Google account",
      'Click "Get API Key" in the left sidebar',
      'Click "Create API Key"',
      "Select an existing Google Cloud project or create a new one",
      "Copy the key (starts with AIza…) and paste below",
    ],
    note: "Gemini Flash is free with generous daily limits. No billing needed.",
  },
  {
    id: "mistral",
    name: "Mistral AI",
    model: "mistral-small-latest",
    tier: "freemium",
    tagline: "Free trial · European AI · Privacy-focused",
    icon: Brain,
    iconColor: "text-orange-400",
    keyUrl: "https://console.mistral.ai/api-keys",
    storageKey: "joy-ai-key-mistral",
    steps: [
      "Go to console.mistral.ai and click Sign Up",
      "Create an account and verify your email",
      'In the left sidebar click "API Keys"',
      'Click "Create new key"',
      "Copy the key (starts with…) and paste below",
    ],
    note: "Mistral offers a free trial period. You may need to add a payment method after the trial.",
  },
  {
    id: "claude",
    name: "Claude (Anthropic)",
    model: "claude-sonnet-4-20250514",
    tier: "paid",
    tagline: "Paid · Best quality · Deep reasoning",
    icon: Sparkles,
    iconColor: "text-amber-400",
    keyUrl: "https://console.anthropic.com/settings/keys",
    storageKey: "joy-ai-key-claude",
    steps: [
      "Go to console.anthropic.com and sign up or log in",
      'Click "Settings" in the top right, then "API Keys"',
      'Click "Create Key" and give it a name',
      "Add a payment method if prompted (pay-as-you-go, very affordable)",
      "Copy the key (starts with sk-ant-…) and paste below",
    ],
    note: "Claude gives the most thorough theological responses. Cost is very low (~$0.003 per response).",
  },
  {
    id: "chatgpt",
    name: "ChatGPT (OpenAI)",
    model: "gpt-4o-mini",
    tier: "paid",
    tagline: "Paid · Reliable · Widely used",
    icon: Brain,
    iconColor: "text-green-400",
    keyUrl: "https://platform.openai.com/api-keys",
    storageKey: "joy-ai-key-chatgpt",
    steps: [
      "Go to platform.openai.com and log in or create an account",
      'Click "API keys" in the left sidebar',
      'Click "Create new secret key" and give it a name',
      "Add a payment method and add $5 credit to get started",
      "Copy the key (starts with sk-…) and paste below",
    ],
    note: "GPT-4o-mini is very affordable (~$0.0002 per response) and highly capable.",
  },
  {
    id: "cohere",
    name: "Cohere",
    model: "command-r",
    tier: "freemium",
    tagline: "Free trial · Good for long responses",
    icon: Globe,
    iconColor: "text-teal-400",
    keyUrl: "https://dashboard.cohere.com/api-keys",
    storageKey: "joy-ai-key-cohere",
    steps: [
      "Go to dashboard.cohere.com and click Sign Up",
      "Create a free account with your email",
      'Click "API Keys" in the left sidebar',
      'Click "New Trial Key"',
      "Copy the key and paste below",
    ],
    note: "Cohere offers a free trial API key that works without a credit card.",
  },
  {
    id: "perplexity",
    name: "Perplexity AI",
    model: "llama-3.1-sonar-small-128k-online",
    tier: "paid",
    tagline: "Paid · Has web search · Current info",
    icon: Globe,
    iconColor: "text-purple-400",
    keyUrl: "https://www.perplexity.ai/settings/api",
    storageKey: "joy-ai-key-perplexity",
    steps: [
      "Go to perplexity.ai and log in or create an account",
      'Click your profile → "Settings"',
      'Click the "API" tab',
      "Add $5 credit to activate API access",
      'Click "Generate" to create an API key and paste below',
    ],
    note: "Perplexity can search the web for current information, useful for recent theological resources.",
  },
];

const TIER_LABELS: Record<string, { label: string; className: string }> = {
  free:      { label: "FREE",      className: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" },
  freemium:  { label: "FREE TRIAL", className: "bg-blue-500/20 text-blue-400 border border-blue-500/30" },
  paid:      { label: "PAID",      className: "bg-amber-500/20 text-amber-400 border border-amber-500/30" },
};

/* ── localStorage helpers ───────────────────────────────────────── */

function getStoredKey(storageKey: string): string {
  return localStorage.getItem(storageKey) ?? "";
}

function saveKey(storageKey: string, key: string): void {
  if (key.trim()) {
    localStorage.setItem(storageKey, key.trim());
  } else {
    localStorage.removeItem(storageKey);
  }
}

function setPreferredProvider(id: ProviderId): void {
  localStorage.setItem("joy-ai-provider", id);
}

function getFirstSavedProvider(): string {
  // Returns the stored preferred provider, or the first provider that has a key
  const stored = localStorage.getItem("joy-ai-provider");
  if (stored) return stored;
  return PROVIDERS.find((p) => !!getStoredKey(p.storageKey))?.id ?? "groq";
}

/* ────────────────────────────────────────────────────────────────────
   Provider Card
──────────────────────────────────────────────────────────────────── */

function ProviderCard({
  provider,
  isSelected,
  onSelect,
}: {
  provider: ProviderDef;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [keyValue, setKeyValue] = useState(getStoredKey(provider.storageKey));
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(!!getStoredKey(provider.storageKey));
  const tierInfo = TIER_LABELS[provider.tier];
  const Icon = provider.icon;

  const handleSave = () => {
    saveKey(provider.storageKey, keyValue);
    if (keyValue.trim()) {
      setPreferredProvider(provider.id);
      setSaved(true);
      onSelect();
    } else {
      setSaved(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border transition-all duration-200 overflow-hidden",
        isSelected
          ? "border-gold-500/50 bg-gold-500/5"
          : isDark
            ? "border-white/8 bg-navy-800/60"
            : "border-black/8 bg-white/60",
      )}
    >
      {/* Card header — always visible */}
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Icon */}
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            isDark ? "bg-navy-700" : "bg-surface",
          )}
        >
          <Icon size={18} className={provider.iconColor} />
        </div>

        {/* Name + tagline */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold">{provider.name}</span>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide", tierInfo.className)}>
              {tierInfo.label}
            </span>
            {saved && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                <CheckCircle2 size={11} /> Key saved
              </span>
            )}
          </div>
          <p className="text-muted text-[11px] mt-0.5 truncate">{provider.tagline}</p>
        </div>

        {/* Expand chevron */}
        {expanded ? (
          <ChevronUp size={16} className="text-muted flex-shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-muted flex-shrink-0" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/8">
          {/* Note */}
          {provider.note && (
            <p className="text-[12px] text-gold-400/90 bg-gold-500/8 rounded-xl px-3 py-2 mt-3">
              💡 {provider.note}
            </p>
          )}

          {/* Step-by-step guide */}
          <div className="space-y-2 mt-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
              How to get your API key
            </p>
            <ol className="space-y-2">
              {provider.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-[12px]">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-500/20 text-gold-400 text-[10px] font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-secondary leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>

            {/* Open provider website */}
            <a
              href={provider.keyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-2 text-[12px] font-semibold text-gold-400 hover:text-gold-300 transition-colors"
            >
              <ExternalLink size={13} />
              Open {provider.name} website
            </a>
          </div>

          {/* API key input */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
              Paste your API key here
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
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                  placeholder={`Paste ${provider.name} API key…`}
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

            {saved && keyValue.trim() && (
              <p className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                <CheckCircle2 size={12} />
                Key saved — this provider will be used for AI responses
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Main AIKeySetup component
──────────────────────────────────────────────────────────────────── */

interface AIKeySetupProps {
  onComplete: (providerId: string) => void;
  onSkip: () => void;
  /** When true renders as a full-screen modal (default).
   *  When false renders inline (for the More/Settings page). */
  inline?: boolean;
}

export function AIKeySetup({ onComplete, onSkip, inline = false }: AIKeySetupProps) {
  const { isDark } = useTheme();
  const [selectedProvider, setSelectedProvider] = useState<ProviderId | null>(
    () => (localStorage.getItem("joy-ai-provider") as ProviderId | null)
  );

  const hasAnyKey = PROVIDERS.some((p) => !!getStoredKey(p.storageKey));

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
        <div>
          <h2 className="font-display text-xl font-bold">AI Study Assistant</h2>
          <p className="text-muted text-[13px] mt-0.5">
            Choose a provider and add your API key
          </p>
        </div>
        {!inline && (
          <button
            onClick={onSkip}
            className="p-2 rounded-full text-muted hover:text-secondary hover:bg-surface transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Info banner */}
      <div className="mx-5 mb-3 rounded-xl bg-gold-500/10 border border-gold-500/20 px-4 py-3 flex-shrink-0">
        <p className="text-[12px] text-gold-400 leading-relaxed">
          <strong>Your key is stored only on your device.</strong> It is never sent to our servers — only directly to the AI provider when you tap "Ask AI".
        </p>
      </div>

      {/* Free providers label */}
      <div className="px-5 mb-2 flex-shrink-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
          ✅ Start free — no credit card needed
        </p>
      </div>

      {/* Provider list — scrollable */}
      <div
        className="flex-1 overflow-y-auto px-5 space-y-3 pb-4"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {/* Free providers first */}
        {PROVIDERS.filter((p) => p.tier === "free").map((p) => (
          <ProviderCard
            key={p.id}
            provider={p}
            isSelected={selectedProvider === p.id}
            onSelect={() => setSelectedProvider(p.id)}
          />
        ))}

        {/* Free trial providers */}
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted pt-2">
          🔑 Free trial available
        </p>
        {PROVIDERS.filter((p) => p.tier === "freemium").map((p) => (
          <ProviderCard
            key={p.id}
            provider={p}
            isSelected={selectedProvider === p.id}
            onSelect={() => setSelectedProvider(p.id)}
          />
        ))}

        {/* Paid providers */}
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted pt-2">
          💳 Paid providers (best quality)
        </p>
        {PROVIDERS.filter((p) => p.tier === "paid").map((p) => (
          <ProviderCard
            key={p.id}
            provider={p}
            isSelected={selectedProvider === p.id}
            onSelect={() => setSelectedProvider(p.id)}
          />
        ))}
      </div>

      {/* Footer buttons */}
      <div
        className="flex gap-3 px-5 py-4 border-t border-white/8 flex-shrink-0"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)" }}
      >
        <button onClick={onSkip} className="btn-secondary flex-1">
          Skip for now
        </button>
        <button
          onClick={() => onComplete(selectedProvider ?? getFirstSavedProvider())}
          disabled={!hasAnyKey}
          className={cn(
            "btn-primary flex-1",
            !hasAnyKey && "opacity-40 cursor-not-allowed",
          )}
        >
          <ChevronRight size={16} />
          {hasAnyKey ? "Done" : "Add a key first"}
        </button>
      </div>
    </div>
  );

  // Inline mode — just render the content directly (for Settings page)
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

  // Modal mode — full screen with backdrop above everything
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" />

      {/* Sheet */}
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
