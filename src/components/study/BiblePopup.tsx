import React, { useState, useEffect, useCallback, useRef } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { lookupMultiTranslation } from "@/lib/localBible";

// ─── Types ─────────────────────────────────────────────────────────────────

type Translation = "kjv" | "web" | "esv";

interface VerseResult {
  verses: Array<{ verse: number; text: string }>;
  reference: string;
  translation: string;
}

interface BiblePopupProps {
  reference: string;
  onClose: () => void;
  onOpenInReader?: () => void;
}

// ─── Theology Prompt ───────────────────────────────────────────────────────

function buildTheologyPrompt(reference: string, verseText: string): string {
  return `You are a Christian theologian with strong expertise in Seventh-day Adventist Church doctrine, biblical exegesis, and systematic theology. Your goal is not only accuracy, but to help the reader grow in clear understanding step-by-step.

The verse being studied is: **${reference}**
"${verseText}"

Guide me through it using this progressive structure (from basic to deep understanding):

---

**1. The Verse (Foundation)**
Quote the verse exactly in KJV and ESV.

---

**2. Immediate Context (Zoom Out Slightly)**
Provide 2 verses before and after (KJV). Briefly explain what is happening in this passage in plain terms.

---

**3. Simple Meaning (Clarity First)**
Explain the verse in clear, simple language. Answer: What is this verse saying directly? Avoid theological jargon here.

---

**4. Deeper Meaning (Build Understanding)**
Now expand into key themes, spiritual principles, and doctrinal significance. Clearly distinguish what the text says vs what it teaches.

---

**5. Original Language Insight (Precision Layer)**
Highlight key words (Hebrew/Greek). For each: original term + transliteration, meaning within this verse's context. Show how this deepens understanding.

---

**6. Biblical Context (Big Picture)**
Place the verse within the chapter, the book, and the Bible story (creation → fall → redemption → restoration).

---

**7. Spirit of Prophecy Insight**
Include relevant insight from Ellen G. White directly tied to the verse. Include source reference where possible.

---

**8. Supporting Biblical Connections**
Provide related verses with a brief explanation of how they connect.

---

**9. Adventist Understanding**
Explain how this verse is understood within SDA theology: Great Controversy, Law & Grace, Sanctuary (if applicable).

---

**10. Broader Christian Perspective (Optional Depth)**
Include insight from John Piper only if it adds value. Focus on practical or theological reinforcement.

---

**11. Advanced Insights (Only if Present)**
Include briefly if relevant: literary structure (parallelism, contrast, chiasm), typology (especially sanctuary-related), prophetic or end-time connections (Daniel/Revelation).

---

**12. Practical Application (Transformation)**
Answer clearly: What does this mean for my life? What should change in thinking or behavior?

---

**13. Confidence Indicator (Clarity on Certainty)**
For key sections, indicate: High → Clear and strongly supported | Medium → Reasonable but interpretive | Low → Speculative or debated.

---

**14. Sermon Insight (Simple Summary)**
3–5 lines capturing the core spiritual message.`;
}

// ─── ESV Fetcher ──────────────────────────────────────────────────────────

async function fetchESV(reference: string): Promise<VerseResult | null> {
  try {
    // Encode reference for URL
    const encoded = encodeURIComponent(reference);

    // Try the ESV API (free tier, no key needed for basic queries)
    const res = await fetch(
      `https://api.esv.org/v3/passage/text/?q=${encoded}&include-headings=false&include-footnotes=false&include-verse-numbers=true&include-short-copyright=false&include-passage-references=false`,
      {
        headers: {
          Authorization: "Token TEST", // Public test token — replace with real key if available
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      const text: string = data.passages?.[0] ?? "";
      if (text) {
        // Parse verse numbers from ESV response format "[1] text [2] text"
        const verseMatches = [...text.matchAll(/\[(\d+)\]\s*([\s\S]*?)(?=\[\d+\]|$)/g)];
        if (verseMatches.length > 0) {
          return {
            reference,
            translation: "ESV",
            verses: verseMatches.map((m) => ({
              verse: parseInt(m[1]),
              text: m[2].replace(/\s+/g, " ").trim(),
            })),
          };
        }
      }
    }
  } catch {
    // ESV API failed — fall through
  }

  // Fallback: try bible-api.com with esv (may not be available but worth trying)
  try {
    const encoded = encodeURIComponent(reference);
    const res = await fetch(
      `https://bible-api.com/${encoded}?translation=esv`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.verses?.length) {
        return {
          reference: data.reference ?? reference,
          translation: "ESV",
          verses: data.verses.map((v: { verse: number; text: string }) => ({
            verse: v.verse,
            text: v.text.trim(),
          })),
        };
      }
    }
  } catch {
    // Both failed
  }

  return null;
}

// ─── AI Caller ────────────────────────────────────────────────────────────

async function callAI(
  prompt: string,
  apiKeys: Record<string, string>,
  onChunk: (text: string) => void,
  signal: AbortSignal
): Promise<void> {
  // Try providers in order: Claude → Groq → OpenRouter → ChatGPT
  const claudeKey = apiKeys?.claude || apiKeys?.anthropic || "";
  const groqKey = apiKeys?.groq || "";
  const openrouterKey = apiKeys?.openrouter || "";
  const openaiKey = apiKeys?.openai || apiKeys?.chatgpt || "";

  // ── Claude (Anthropic) ─────────────────────────────────────────────────
  if (claudeKey) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 4096,
        stream: true,
        messages: [{ role: "user", content: prompt }],
      }),
      signal,
    });
    if (res.ok && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.slice(6));
              const text = json.delta?.text ?? "";
              if (text) onChunk(text);
            } catch {
              // skip
            }
          }
        }
      }
      return;
    }
  }

  // ── Groq ──────────────────────────────────────────────────────────────
  if (groqKey) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 4096,
        stream: true,
        messages: [{ role: "user", content: prompt }],
      }),
      signal,
    });
    if (res.ok && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ") && !line.includes("[DONE]")) {
            try {
              const json = JSON.parse(line.slice(6));
              const text = json.choices?.[0]?.delta?.content ?? "";
              if (text) onChunk(text);
            } catch {
              // skip
            }
          }
        }
      }
      return;
    }
  }

  // ── OpenRouter ────────────────────────────────────────────────────────
  if (openrouterKey) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openrouterKey}`,
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-5-sonnet",
        max_tokens: 4096,
        stream: true,
        messages: [{ role: "user", content: prompt }],
      }),
      signal,
    });
    if (res.ok && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ") && !line.includes("[DONE]")) {
            try {
              const json = JSON.parse(line.slice(6));
              const text = json.choices?.[0]?.delta?.content ?? "";
              if (text) onChunk(text);
            } catch {
              // skip
            }
          }
        }
      }
      return;
    }
  }

  // ── OpenAI / ChatGPT ──────────────────────────────────────────────────
  if (openaiKey) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 4096,
        stream: true,
        messages: [{ role: "user", content: prompt }],
      }),
      signal,
    });
    if (res.ok && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ") && !line.includes("[DONE]")) {
            try {
              const json = JSON.parse(line.slice(6));
              const text = json.choices?.[0]?.delta?.content ?? "";
              if (text) onChunk(text);
            } catch {
              // skip
            }
          }
        }
      }
      return;
    }
  }

  throw new Error("No AI provider available. Add an API key in Settings → More.");
}

// ─── Markdown renderer (simple, no dependency) ────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // H1/H2/H3
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={key++} className="text-gold-400 font-bold text-sm mt-4 mb-1">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key++} className="text-gold-300 font-bold text-base mt-5 mb-1">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
      // Bold headings like **1. The Verse**
      elements.push(
        <p key={key++} className="text-gold-400 font-bold text-sm mt-4 mb-1">
          {line.slice(2, -2)}
        </p>
      );
    } else if (line.startsWith("---")) {
      elements.push(<hr key={key++} className="border-white/10 my-3" />);
    } else if (line.startsWith("- ") || line.startsWith("• ")) {
      elements.push(
        <div key={key++} className="flex gap-2 text-sm text-white/80 mb-1">
          <span className="text-gold-400 flex-shrink-0 mt-0.5">•</span>
          <span>{inlineFormat(line.slice(2))}</span>
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={key++} className="h-1" />);
    } else {
      elements.push(
        <p key={key++} className="text-sm text-white/85 leading-relaxed mb-1">
          {inlineFormat(line)}
        </p>
      );
    }
  }

  return elements;
}

function inlineFormat(text: string): React.ReactNode {
  // Bold **text** and italic *text*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i} className="text-gold-200 italic">{part.slice(1, -1)}</em>;
    return part;
  });
}

// ─── Component ────────────────────────────────────────────────────────────

export function BiblePopup({ reference, onClose, onOpenInReader }: BiblePopupProps) {
  const { settings } = useAppStore();

  // Translation tabs — ASV removed, ESV added as inline tab
  const [activeTab, setActiveTab] = useState<Translation>("kjv");

  // Verse data per translation
  const [verseData, setVerseData] = useState<Partial<Record<Translation, VerseResult>>>({});
  const [loadingTab, setLoadingTab] = useState<Partial<Record<Translation, boolean>>>({ kjv: true });
  const [errorTab, setErrorTab] = useState<Partial<Record<Translation, string>>>({});

  // UI state
  const [copied, setCopied] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // AI state
  const [showAi, setShowAi] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiExpanded, setAiExpanded] = useState(true);
  const aiAbortRef = useRef<AbortController | null>(null);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  // ── Online / offline detection ─────────────────────────────────────────
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // ── Fetch a translation ────────────────────────────────────────────────
  const fetchTranslation = useCallback(
    async (translation: Translation) => {
      if (verseData[translation]) return; // already loaded
      setLoadingTab((p) => ({ ...p, [translation]: true }));
      setErrorTab((p) => ({ ...p, [translation]: undefined }));

      try {
        if (translation === "esv") {
          const result = await fetchESV(reference);
          if (result) {
            setVerseData((p) => ({ ...p, esv: result }));
          } else {
            setErrorTab((p) => ({
              ...p,
              esv: "ESV not available offline. Tap to view on Bible Gateway.",
            }));
          }
        } else {
          // KJV / WEB — use existing localBible helper
          const result = await lookupMultiTranslation(reference, [translation]);
          const verses = result?.[translation];
          if (verses?.length) {
            setVerseData((p) => ({
              ...p,
              [translation]: {
                reference,
                translation: translation.toUpperCase(),
                verses,
              },
            }));
          } else {
            setErrorTab((p) => ({
              ...p,
              [translation]: "Verse not found. Check your connection.",
            }));
          }
        }
      } catch (err) {
        setErrorTab((p) => ({
          ...p,
          [translation]: err instanceof Error ? err.message : "Failed to load verse.",
        }));
      } finally {
        setLoadingTab((p) => ({ ...p, [translation]: false }));
      }
    },
    [reference, verseData]
  );

  // Load KJV on mount
  useEffect(() => {
    fetchTranslation("kjv");
  }, [reference]); // eslint-disable-line

  // Load translation on tab switch
  const handleTabChange = (tab: Translation) => {
    setActiveTab(tab);
    fetchTranslation(tab);
  };

  // ── Copy verse text ────────────────────────────────────────────────────
  const handleCopy = () => {
    const data = verseData[activeTab];
    if (!data) return;
    const text =
      `${data.reference} (${data.translation})\n\n` +
      data.verses.map((v) => `${v.verse} ${v.text}`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Ask AI ─────────────────────────────────────────────────────────────
  const handleAskAI = async () => {
    // Get verse text to include in prompt
    const data = verseData[activeTab] ?? verseData["kjv"];
    const verseText = data?.verses.map((v) => v.text).join(" ") ?? "";

    const prompt = buildTheologyPrompt(reference, verseText);

    // Cancel any in-progress request
    if (aiAbortRef.current) aiAbortRef.current.abort();
    aiAbortRef.current = new AbortController();

    setShowAi(true);
    setAiExpanded(true);
    setAiText("");
    setAiError(null);
    setAiLoading(true);

    // Get API keys from store
    // The app stores them in settings — adjust the key path to match your store shape
    const apiKeys: Record<string, string> = {
      claude: (settings as Record<string, unknown>).claudeApiKey as string ?? "",
      groq: (settings as Record<string, unknown>).groqApiKey as string ?? "",
      openrouter: (settings as Record<string, unknown>).openrouterApiKey as string ?? "",
      openai: (settings as Record<string, unknown>).openaiApiKey as string ?? "",
      // Also try the providers array shape the app might use
      ...(
        Array.isArray((settings as Record<string, unknown>).aiProviders)
          ? Object.fromEntries(
              ((settings as Record<string, unknown>).aiProviders as Array<{ id: string; key: string }>)
                .map((p) => [p.id, p.key])
            )
          : {}
      ),
    };

    try {
      await callAI(
        prompt,
        apiKeys,
        (chunk) => {
          setAiText((prev) => prev + chunk);
          // Auto-scroll AI panel
          setTimeout(() => {
            aiScrollRef.current?.scrollTo({
              top: aiScrollRef.current.scrollHeight,
              behavior: "smooth",
            });
          }, 50);
        },
        aiAbortRef.current.signal
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setAiError(
          err instanceof Error
            ? err.message
            : "AI request failed. Check your API keys in More → Settings."
        );
      }
    } finally {
      setAiLoading(false);
    }
  };

  // Stop AI generation
  const handleStopAI = () => {
    aiAbortRef.current?.abort();
    setAiLoading(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      aiAbortRef.current?.abort();
    };
  }, []);

  // ── Open in Reader ─────────────────────────────────────────────────────
  const handleOpenInReader = () => {
    onOpenInReader?.();
    onClose();
  };

  // ── Open ESV on Bible Gateway ──────────────────────────────────────────
  const handleOpenESVExternal = () => {
    const url = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(reference)}&version=ESV`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // ── Current verse display ──────────────────────────────────────────────
  const currentData = verseData[activeTab];
  const currentLoading = loadingTab[activeTab];
  const currentError = errorTab[activeTab];

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-navy-800 rounded-t-2xl"
        style={{
          maxHeight: "88dvh",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)",
        }}
        role="dialog"
        aria-label={`Scripture: ${reference}`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pb-3 flex-shrink-0">
          <div>
            <p className="text-gold-500 text-xs font-bold tracking-widest uppercase mb-1">
              Scripture
            </p>
            <h2 className="text-white text-2xl font-bold leading-tight">{reference}</h2>
          </div>
          <button
            onClick={onClose}
            className="ml-4 mt-1 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Tab row: KJV | WEB | ESV | [Ask AI] ── */}
        <div className="flex items-center gap-2 px-5 pb-3 flex-shrink-0 overflow-x-auto">
          {/* KJV */}
          <TabButton
            label="KJV"
            active={activeTab === "kjv"}
            onClick={() => handleTabChange("kjv")}
          />

          {/* WEB */}
          <TabButton
            label="WEB"
            active={activeTab === "web"}
            onClick={() => handleTabChange("web")}
          />

          {/* ESV — inline tab (was external link, now 3rd position where ASV was) */}
          <TabButton
            label="ESV"
            active={activeTab === "esv"}
            onClick={() => handleTabChange("esv")}
          />

          {/* Divider */}
          <div className="w-px h-6 bg-white/15 mx-1 flex-shrink-0" />

          {/* Ask AI button — 4th position after ESV */}
          <button
            onClick={handleAskAI}
            disabled={aiLoading}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold",
              "border transition-all duration-200 flex-shrink-0",
              aiLoading
                ? "bg-gold-500/20 border-gold-500/40 text-gold-300 cursor-not-allowed"
                : showAi
                ? "bg-gold-500/25 border-gold-500/60 text-gold-300"
                : "bg-white/8 border-white/20 text-white/70 hover:bg-gold-500/15 hover:border-gold-500/40 hover:text-gold-300"
            )}
            aria-label="Ask AI about this verse"
          >
            {aiLoading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            <span>Ask AI</span>
          </button>

          {/* Offline indicator */}
          {!isOnline && (
            <div className="flex items-center gap-1 ml-1 text-white/40 flex-shrink-0">
              <WifiOff size={12} />
              <span className="text-xs">Offline</span>
            </div>
          )}
        </div>

        {/* ── Scrollable content area ── */}
        <div className="flex-1 overflow-y-auto px-5 space-y-4 pb-2">

          {/* Verse content */}
          <div className="bg-navy-700/60 rounded-xl p-4">
            {currentLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-gold-400" />
              </div>
            ) : currentError ? (
              <div className="text-center py-4">
                <p className="text-white/50 text-sm mb-3">{currentError}</p>
                {activeTab === "esv" && (
                  <button
                    onClick={handleOpenESVExternal}
                    className="text-gold-400 text-sm underline underline-offset-2"
                  >
                    View ESV on Bible Gateway ↗
                  </button>
                )}
              </div>
            ) : currentData ? (
              <div className="space-y-3">
                {currentData.verses.map((v) => (
                  <p key={v.verse} className="text-white leading-relaxed text-base">
                    <sup className="text-gold-400 font-bold text-xs mr-1.5 select-none">
                      {v.verse}
                    </sup>
                    {v.text}
                  </p>
                ))}
                <p className="text-white/30 text-xs text-right mt-2">
                  {currentData.translation}
                </p>
              </div>
            ) : null}
          </div>

          {/* ── AI Response panel ── */}
          {showAi && (
            <div className="bg-navy-700/80 border border-gold-500/20 rounded-xl overflow-hidden">
              {/* AI header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-gold-400" />
                  <span className="text-gold-400 text-xs font-bold tracking-wide uppercase">
                    Theological Deep Dive
                  </span>
                  {aiLoading && (
                    <Loader2 size={12} className="animate-spin text-gold-400/60" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {aiLoading && (
                    <button
                      onClick={handleStopAI}
                      className="text-white/40 hover:text-white/70 text-xs transition-colors"
                    >
                      Stop
                    </button>
                  )}
                  <button
                    onClick={() => setAiExpanded((e) => !e)}
                    className="text-white/40 hover:text-white/70 transition-colors"
                    aria-label={aiExpanded ? "Collapse" : "Expand"}
                  >
                    {aiExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* AI content */}
              {aiExpanded && (
                <div
                  ref={aiScrollRef}
                  className="px-4 py-3 max-h-96 overflow-y-auto space-y-0.5"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {aiError ? (
                    <p className="text-red-400 text-sm">{aiError}</p>
                  ) : aiText ? (
                    <>{renderMarkdown(aiText)}</>
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

        {/* ── Footer actions ── */}
        <div className="flex items-center gap-3 px-5 pt-3 pb-1 border-t border-white/8 flex-shrink-0">
          {/* Copy */}
          <button
            onClick={handleCopy}
            disabled={!currentData}
            className={cn(
              "flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl text-sm font-semibold transition-all",
              "bg-white/8 text-white/70 hover:bg-white/15 hover:text-white",
              "disabled:opacity-30 disabled:cursor-not-allowed"
            )}
          >
            {copied ? (
              <>
                <CheckCircle2 size={16} className="text-green-400" />
                <span className="text-green-400">Copied</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Open in Reader */}
          {onOpenInReader && (
            <button
              onClick={handleOpenInReader}
              className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl text-sm font-semibold bg-gold-500/15 text-gold-400 hover:bg-gold-500/25 transition-all"
            >
              <BookOpen size={16} />
              <span>Open in Reader</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────

function TabButton({
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
        "px-4 py-2 rounded-xl text-sm font-bold transition-all flex-shrink-0",
        active
          ? "bg-gold-500 text-navy-900 shadow-md"
          : "bg-white/8 text-white/60 hover:bg-white/15 hover:text-white"
      )}
    >
      {label}
    </button>
  );
}