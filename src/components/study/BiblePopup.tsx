import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Copy,
  BookOpen,
  Sparkles,
  Loader2,
  CheckCircle2,
  WifiOff,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PROVIDERS,
  getStoredKey,
  getStoredProvider,
  type ChatMessage,
} from "@/lib/aiProvider";

// ─── Types ────────────────────────────────────────────────────────────────

type InlineTab = "kjv" | "web" | "esv";

interface BibleVerse {
  verse: number;
  text: string;
}

interface VerseData {
  reference: string;
  translation: string;
  verses: BibleVerse[];
}

export interface BiblePopupProps {
  reference: string | null;
  onClose: () => void;
  onOpenReader?: (ref: string) => void;
}

// ─── bible-api.com fetcher ────────────────────────────────────────────────

async function fetchFromBibleApi(
  reference: string,
  translation: "kjv" | "web" | "esv"
): Promise<VerseData | null> {
  try {
    const encoded = encodeURIComponent(reference);
    const res = await fetch(
      `https://bible-api.com/${encoded}?translation=${translation}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.verses?.length) return null;
    return {
      reference: data.reference ?? reference,
      translation: translation.toUpperCase(),
      verses: (data.verses as Array<{ verse: number; text: string }>).map(
        (v) => ({ verse: v.verse, text: v.text.trim() })
      ),
    };
  } catch {
    return null;
  }
}

// ─── Theology Prompt ──────────────────────────────────────────────────────

function buildTheologyPrompt(reference: string, verseText: string): string {
  return `You are a Christian theologian with strong expertise in Seventh-day Adventist Church doctrine, biblical exegesis, and systematic theology. Your goal is not only accuracy, but to help the reader grow in clear understanding step-by-step.

The verse being studied is: **${reference}**
"${verseText}"

Guide me through it using this progressive structure:

**1. The Verse (Foundation)**
Quote the verse exactly in KJV and ESV.

---

**2. Immediate Context (Zoom Out Slightly)**
Provide 2 verses before and after (KJV). Briefly explain what is happening in this passage in plain terms.

---

**3. Simple Meaning (Clarity First)**
Explain the verse in clear, simple language. What is this verse saying directly? Avoid theological jargon.

---

**4. Deeper Meaning (Build Understanding)**
Key themes, spiritual principles, and doctrinal significance. Distinguish what the text says vs what it teaches.

---

**5. Original Language Insight (Precision Layer)**
Key words in Hebrew/Greek: original term + transliteration + meaning in context.

---

**6. Biblical Context (Big Picture)**
Place the verse within the chapter, the book, and the Bible story (creation to fall to redemption to restoration).

---

**7. Spirit of Prophecy Insight**
Relevant insight from Ellen G. White directly tied to the verse, with source reference.

---

**8. Supporting Biblical Connections**
Related verses with brief explanation of how they connect.

---

**9. Adventist Understanding**
How this verse is understood within SDA theology: Great Controversy, Law and Grace, Sanctuary if applicable.

---

**10. Broader Christian Perspective**
Insight from John Piper only if it adds practical or theological value.

---

**11. Advanced Insights (Only if Present)**
Literary structure, typology, prophetic or end-time connections (Daniel/Revelation) if relevant.

---

**12. Practical Application (Transformation)**
What does this mean for my life? What should change in thinking or behavior?

---

**13. Confidence Indicator**
For key sections: High = clear and strongly supported | Medium = reasonable but interpretive | Low = speculative or debated.

---

**14. Sermon Insight (Simple Summary)**
3 to 5 lines capturing the core spiritual message.`;
}

// ─── AI Streaming ─────────────────────────────────────────────────────────

async function streamTheologyAI(
  reference: string,
  verseText: string,
  onChunk: (text: string) => void,
  signal: AbortSignal
): Promise<void> {
  const prompt = buildTheologyPrompt(reference, verseText);

  const storedId = getStoredProvider();
  const orderedProviders = [
    ...(storedId ? PROVIDERS.filter((p) => p.id === storedId) : []),
    ...PROVIDERS.filter((p) => p.id !== storedId),
  ];

  for (const provider of orderedProviders) {
    const key = getStoredKey(provider.id);
    if (!key) continue;

    const messages: ChatMessage[] = [{ role: "user", content: prompt }];

    try {
      if (provider.id === "claude") {
        const res = await fetch(provider.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: provider.model,
            max_tokens: 4096,
            stream: true,
            messages,
          }),
          signal,
        });
        if (!res.ok || !res.body) continue;
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of dec.decode(value).split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const t = JSON.parse(line.slice(6))?.delta?.text ?? "";
              if (t) onChunk(t);
            } catch { /* skip */ }
          }
        }
        return;
      } else {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        };
        if (provider.id === "openrouter") {
          headers["HTTP-Referer"] = "https://leemcq.github.io/joy-in-the-journey/";
          headers["X-Title"] = "Joy in the Journey";
        }
        const res = await fetch(provider.endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: provider.model,
            max_tokens: 4096,
            stream: true,
            messages,
          }),
          signal,
        });
        if (!res.ok || !res.body) continue;
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of dec.decode(value).split("\n")) {
            if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
            try {
              const t = JSON.parse(line.slice(6))?.choices?.[0]?.delta?.content ?? "";
              if (t) onChunk(t);
            } catch { /* skip */ }
          }
        }
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") throw e;
      continue;
    }
  }

  throw new Error(
    "No AI provider configured. Add an API key in More → Settings."
  );
}

// ─── Markdown renderer ────────────────────────────────────────────────────

function MarkdownBlock({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => {
        if (line.startsWith("**") && line.endsWith("**") && line.length > 4)
          return (
            <p key={i} className="text-gold-400 font-bold text-sm mt-4 mb-1 leading-snug">
              {line.slice(2, -2)}
            </p>
          );
        if (line.startsWith("---"))
          return <hr key={i} className="border-white/10 my-3" />;
        if (line.startsWith("- ") || line.startsWith("• "))
          return (
            <div key={i} className="flex gap-2 text-sm text-white/80 mb-1">
              <span className="text-gold-400 flex-shrink-0 mt-0.5">•</span>
              <span>{inlineFmt(line.slice(2))}</span>
            </div>
          );
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return (
          <p key={i} className="text-sm text-white/85 leading-relaxed mb-0.5">
            {inlineFmt(line)}
          </p>
        );
      })}
    </>
  );
}

function inlineFmt(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return (
        <strong key={i} className="text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    if (part.startsWith("*") && part.endsWith("*"))
      return (
        <em key={i} className="text-gold-200 italic">
          {part.slice(1, -1)}
        </em>
      );
    return part;
  });
}

// ─── Tab Button ───────────────────────────────────────────────────────────

function TabBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-1.5 rounded-xl text-sm font-bold transition-all flex-shrink-0",
        active
          ? "bg-gold-500 text-navy-900 shadow-md"
          : "bg-white/8 text-white/60 hover:bg-white/15 hover:text-white"
      )}
    >
      {label}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

export function BiblePopup({ reference, onClose, onOpenReader }: BiblePopupProps) {
  if (!reference) return null;

  return (
    <BiblePopupInner
      reference={reference}
      onClose={onClose}
      onOpenReader={onOpenReader}
    />
  );
}

function BiblePopupInner({
  reference,
  onClose,
  onOpenReader,
}: {
  reference: string;
  onClose: () => void;
  onOpenReader?: (ref: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<InlineTab>("kjv");
  const [cache, setCache] = useState<Partial<Record<InlineTab, VerseData>>>({});
  const [loading, setLoading] = useState<Partial<Record<InlineTab, boolean>>>({ kjv: true });
  const [tabErr, setTabErr] = useState<Partial<Record<InlineTab, string>>>({});
  const [copied, setCopied] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [showAi, setShowAi] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCollapsed, setAiCollapsed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const aiBodyRef = useRef<HTMLDivElement>(null);

  // Online detection
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const fetchVerse = useCallback(
    async (tab: InlineTab) => {
      if (cache[tab]) return;
      setLoading((p) => ({ ...p, [tab]: true }));
      setTabErr((p) => ({ ...p, [tab]: undefined }));
      try {
        const result = await fetchFromBibleApi(reference, tab);
        if (result) {
          setCache((p) => ({ ...p, [tab]: result }));
        } else {
          setTabErr((p) => ({
            ...p,
            [tab]:
              tab === "esv"
                ? "ESV_EXTERNAL"
                : "Verse not found. Check your connection.",
          }));
        }
      } catch {
        setTabErr((p) => ({ ...p, [tab]: "Could not load verse." }));
      } finally {
        setLoading((p) => ({ ...p, [tab]: false }));
      }
    },
    [reference, cache]
  );

  useEffect(() => {
    fetchVerse("kjv");
  }, [reference, fetchVerse]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const handleTab = (tab: InlineTab) => {
    setActiveTab(tab);
    fetchVerse(tab);
  };

  const handleCopy = () => {
    const d = cache[activeTab];
    if (!d) return;
    const text = `${d.reference} (${d.translation})\n\n${d.verses
      .map((v) => `${v.verse} ${v.text}`)
      .join("\n")}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleAskAI = async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const d = cache[activeTab] ?? cache["kjv"];
    const verseText = d?.verses.map((v) => v.text).join(" ") ?? reference;

    setShowAi(true);
    setAiCollapsed(false);
    setAiText("");
    setAiError(null);
    setAiLoading(true);

    try {
      await streamTheologyAI(
        reference,
        verseText,
        (chunk) => {
          setAiText((prev) => prev + chunk);
          requestAnimationFrame(() => {
            if (aiBodyRef.current)
              aiBodyRef.current.scrollTop = aiBodyRef.current.scrollHeight;
          });
        },
        abortRef.current.signal
      );
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setAiError((e as Error).message ?? "AI request failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleStopAI = () => {
    abortRef.current?.abort();
    setAiLoading(false);
  };

  const cur = cache[activeTab];
  const curLoad = loading[activeTab];
  const curErr = tabErr[activeTab];
  const esvExternal = curErr === "ESV_EXTERNAL";

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-navy-800 rounded-t-2xl shadow-2xl"
        style={{
          maxHeight: "88dvh",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`Scripture: ${reference}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="flex items-start justify-between px-5 pb-3 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-gold-500 text-xs font-bold tracking-widest uppercase mb-1">
              Scripture
            </p>
            <h2 className="text-white text-xl font-bold leading-tight pr-4">
              {reference}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 mt-1"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2 px-5 pb-3 flex-shrink-0" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
          <TabBtn label="KJV" active={activeTab === "kjv"} onClick={() => handleTab("kjv")} />
          <TabBtn label="WEB" active={activeTab === "web"} onClick={() => handleTab("web")} />
          <TabBtn label="ESV" active={activeTab === "esv"} onClick={() => handleTab("esv")} />

          <div className="w-px h-6 bg-white/15 mx-1 flex-shrink-0" />

          <button
            onClick={handleAskAI}
            disabled={aiLoading}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold",
              "border transition-all duration-200 flex-shrink-0",
              showAi
                ? "bg-gold-500/25 border-gold-500/50 text-gold-300"
                : "bg-white/8 border-white/20 text-white/70 hover:bg-gold-500/15 hover:border-gold-500/40 hover:text-gold-300",
              aiLoading && "cursor-not-allowed opacity-70"
            )}
          >
            {aiLoading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            <span>{aiLoading ? "Thinking…" : "Ask AI"}</span>
          </button>

          {!online && (
            <div className="flex items-center gap-1 text-white/40 flex-shrink-0 ml-1">
              <WifiOff size={12} />
              <span className="text-xs">Offline</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 space-y-3 pb-2" style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
          <div className="bg-navy-700/60 rounded-xl p-4 min-h-[80px]">
            {curLoad ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-gold-400" />
              </div>
            ) : esvExternal ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <p className="text-white/50 text-sm text-center">
                  ESV is not available offline.
                </p>
                <a
                  href={`https://www.biblegateway.com/passage/?search=${encodeURIComponent(reference)}&version=ESV`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-500/15 text-gold-400 text-sm font-semibold hover:bg-gold-500/25 transition-colors"
                >
                  <ExternalLink size={14} />
                  View ESV on Bible Gateway
                </a>
              </div>
            ) : curErr ? (
              <div className="text-center py-4">
                <p className="text-white/50 text-sm">{curErr}</p>
              </div>
            ) : cur ? (
              <div className="space-y-3">
                {cur.verses.map((v) => (
                  <p key={v.verse} className="text-white leading-relaxed">
                    <sup className="text-gold-400 font-bold text-xs mr-1.5 select-none">
                      {v.verse}
                    </sup>
                    {v.text}
                  </p>
                ))}
                <p className="text-white/25 text-xs text-right mt-1">
                  {cur.translation}
                </p>
              </div>
            ) : null}
          </div>

          {showAi && (
            <div className="bg-navy-700/80 border border-gold-500/20 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles size={13} className="text-gold-400" />
                  <span className="text-gold-400 text-xs font-bold tracking-wide uppercase">
                    Theological Deep Dive
                  </span>
                  {aiLoading && (
                    <Loader2 size={11} className="animate-spin text-gold-400/60 ml-1" />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {aiLoading && (
                    <button
                      onClick={handleStopAI}
                      className="text-white/40 hover:text-white/70 text-xs transition-colors"
                    >
                      Stop
                    </button>
                  )}
                  <button
                    onClick={() => setAiCollapsed((c) => !c)}
                    className="text-white/40 hover:text-white/70 transition-colors"
                  >
                    {aiCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </button>
                </div>
              </div>

              {!aiCollapsed && (
                <div
                  ref={aiBodyRef}
                  className="px-4 py-3 space-y-0.5"
                  style={{ maxHeight: "50dvh", overflowY: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
                >
                  {aiError ? (
                    <p className="text-red-400 text-sm">{aiError}</p>
                  ) : aiText ? (
                    <MarkdownBlock text={aiText} />
                  ) : aiLoading ? (
                    <p className="text-white/40 text-sm italic animate-pulse">
                      Studying the scripture…
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-5 pt-3 border-t border-white/8 flex-shrink-0">
          <button
            onClick={handleCopy}
            disabled={!cur}
            className={cn(
              "flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl text-sm font-semibold transition-all",
              "bg-white/8 text-white/70 hover:bg-white/15 hover:text-white",
              "disabled:opacity-30 disabled:cursor-not-allowed"
            )}
          >
            {copied ? (
              <>
                <CheckCircle2 size={15} className="text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={15} />
                <span>Copy</span>
              </>
            )}
          </button>

          {onOpenReader && (
            <button
              onClick={() => {
                onOpenReader(reference);
                onClose();
              }}
              className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl text-sm font-semibold bg-gold-500/15 text-gold-400 hover:bg-gold-500/25 transition-all"
            >
              <BookOpen size={15} />
              <span>Open in Reader</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}