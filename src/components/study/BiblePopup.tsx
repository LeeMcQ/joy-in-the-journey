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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getStoredMode,
  storeMode,
  streamWithAI,
  type AIMode,
  type ChatMessage,
} from "@/lib/aiProvider";

// ─── Types ────────────────────────────────────────────────────────────────

type InlineTab = "afr" | "kjv" | "web";

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

// ─── Local Bible fetcher (AFR/KJV/WEB via IndexedDB → JSON → API) ────────

async function fetchFromBibleApi(
  reference: string,
  translation: "afr" | "kjv" | "web"
): Promise<VerseData | null> {
  try {
    const { lookupReference } = await import("@/lib/localBible");
    const result = await lookupReference(reference, translation);
    if (!result.verses.length) return null;
    return {
      reference: result.reference,
      translation: translation.toUpperCase() as VerseData["translation"],
      verses: result.verses.map((v) => ({ verse: v.verse, text: v.text })),
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

Guide me through this passage using the following progressive structure. Build each section upon the previous one, moving from simple understanding to deeper biblical insight. Keep Christ at the center and ensure every conclusion is supported by Scripture. Distinguish clearly between what the text explicitly states and reasonable theological implications. Skip any section that is not genuinely applicable rather than forcing an answer.

1. Simple Meaning (Clarity First)

Explain the passage in plain, modern language. What is the author directly saying? Avoid theological jargon.

---

2. Deeper Meaning (Understanding the Message)

Identify the central themes, spiritual principles, and doctrinal significance. Clearly distinguish:

- What the text says
- What the text teaches
- What should not be inferred beyond the text

---

3. Original Language Insight (Precision Layer)

Highlight key Hebrew or Greek words by providing:

- Original word
- Transliteration
- Literal meaning
- Meaning within this context
- Why the word choice matters

---

4. Biblical Context (Big Picture)

Explain how this passage fits within:

- The surrounding chapter
- The overall purpose of the book
- The unfolding biblical story of Creation, Fall, Redemption, and Restoration

---

5. Spirit of Prophecy Insight

Provide relevant insights from Ellen G. White that directly illuminate the passage, including the source reference. Use only where genuinely applicable.

---

6. Supporting Biblical Connections

List key cross-references and briefly explain how each passage reinforces, expands, or balances the teaching.

---

7. Adventist Understanding

Explain how Seventh-day Adventist theology understands this passage, especially regarding themes such as:

- The Great Controversy
- Law and Grace
- The Sanctuary
- The Sabbath
- The State of the Dead
- The Second Coming
- The Character of God

Include only themes relevant to the passage.

---

8. Broader Christian Perspective

Briefly summarize how respected evangelical scholars (particularly John Piper and Desiring God) interpret or apply the passage when their insights add meaningful theological or practical value.

---

9. Advanced Insights

Where applicable, discuss:

- Literary structure
- Symbolism
- Typology
- Covenant themes
- Messianic fulfillment
- Prophetic significance
- Daniel/Revelation or end-time connections

Do not force these if absent.

---

10. Practical Application (Transformation)

Explain how this passage should shape:

- My understanding of God
- My relationship with Christ
- My character
- My daily decisions
- My spiritual walk and mission

Provide specific, practical applications.

---

11. Sermon Insight (Memorable Summary)

Summarize the heart of the passage in 3–5 powerful sentences that capture its central message and can be remembered or taught to others.

---

12. Key Takeaway

State the single most important truth the passage teaches in one concise sentence.

---

13. Further Study

Provide three progressively deeper research questions:

1. Understanding the text
2. Exploring the theology
3. Applying the truth to Christian living`;
}

// ─── AI Streaming ─────────────────────────────────────────────────────────

async function streamTheologyAI(
  reference: string,
  verseText: string,
  mode: AIMode,
  onChunk: (text: string) => void,
  signal: AbortSignal
): Promise<void> {
  const prompt = buildTheologyPrompt(reference, verseText);
  const messages: ChatMessage[] = [{ role: "user", content: prompt }];
  await streamWithAI(mode, messages, onChunk, signal);
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
  const [activeTab, setActiveTab] = useState<InlineTab>("afr");
  const [cache, setCache] = useState<Partial<Record<InlineTab, VerseData>>>({});
  const [loading, setLoading] = useState<Partial<Record<InlineTab, boolean>>>({ afr: true });
  const [tabErr, setTabErr] = useState<Partial<Record<InlineTab, string>>>({});
  const [copied, setCopied] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [showAi, setShowAi] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCollapsed, setAiCollapsed] = useState(false);
  const [aiMode, setAiMode] = useState<AIMode>(getStoredMode);
  const abortRef = useRef<AbortController | null>(null);
  const aiBodyRef = useRef<HTMLDivElement>(null);

  const handleModeChange = (mode: AIMode) => {
    setAiMode(mode);
    storeMode(mode);
    // Re-run if AI is already showing
    if (showAi && !aiLoading) {
      setAiText("");
      setAiError(null);
      handleAskAIWithMode(mode);
    }
  };

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
            [tab]: "Vers nie gevind nie. Gaan u verbinding na.",
          }));
        }
      } catch {
        setTabErr((p) => ({ ...p, [tab]: "Kon nie vers laai nie." }));
      } finally {
        setLoading((p) => ({ ...p, [tab]: false }));
      }
    },
    [reference, cache]
  );

  useEffect(() => {
    fetchVerse("afr");
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

  const handleAskAIWithMode = async (mode: AIMode) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const d = cache[activeTab] ?? cache["afr"];
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
        mode,
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

  const handleAskAI = () => handleAskAIWithMode(aiMode);

  const handleStopAI = () => {
    abortRef.current?.abort();
    setAiLoading(false);
  };

  const cur = cache[activeTab];
  const curLoad = loading[activeTab];
  const curErr = tabErr[activeTab];

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
          <TabBtn label="AFR" active={activeTab === "afr"} onClick={() => handleTab("afr")} />
          <TabBtn label="KJV" active={activeTab === "kjv"} onClick={() => handleTab("kjv")} />
          <TabBtn label="WEB" active={activeTab === "web"} onClick={() => handleTab("web")} />

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
                    AI Study
                  </span>
                  {aiLoading && (
                    <Loader2 size={11} className="animate-spin text-gold-400/60 ml-1" />
                  )}
                  {/* Normal / Deep toggle */}
                  <div className="flex items-center rounded-lg bg-white/8 p-0.5 ml-1">
                    {(["normal", "deep"] as AIMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => handleModeChange(m)}
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-all",
                          aiMode === m
                            ? "bg-gold-500 text-navy-900"
                            : "text-white/40 hover:text-white/60"
                        )}
                      >
                        {m === "normal" ? "Normal" : "Deep"}
                      </button>
                    ))}
                  </div>
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