import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Copy, BookOpen, Sparkles, Loader2,
  WifiOff, ChevronDown, ChevronUp, Share2, ExternalLink, Bookmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getStoredMode, storeMode, streamWithAI, buildMessages,
  type AIMode,
} from "@/lib/aiProvider";
import { showToast } from "@/components/ui/Toast";
import { formatVerseMessage, shareOrCopy } from "@/lib/sharing";
import { MarkdownBlock } from "@/components/ui/MarkdownBlock";

// ─── Types ─────────────────────────────────────────────────────────────────

type InlineTab = "afr" | "kjv" | "web" | "xho";

interface BibleVerse { verse: number; text: string; }

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

// ─── Bible Gateway translations (always GNB first) ─────────────────────────
const BG_TRANSLATIONS = [
  { id: "GNT",  label: "GNB" },
  { id: "NIV",  label: "NIV" },
  { id: "ESV",  label: "ESV" },
  { id: "NLT",  label: "NLT" },
  { id: "NKJV", label: "NKJV" },
];

function bibleGatewayUrl(reference: string, version: string): string {
  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(reference)}&version=${version}`;
}

// ─── Local Bible fetcher ────────────────────────────────────────────────────

async function fetchFromBibleApi(
  reference: string,
  translation: "afr" | "kjv" | "web" | "xho"
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

// ─── AI Streaming ───────────────────────────────────────────────────────────

async function streamTheologyAI(
  reference: string, verseText: string, mode: AIMode,
  onChunk: (text: string) => void, signal: AbortSignal
): Promise<void> {
  const messages = buildMessages({
    task: "scripture",
    mode,
    vars: { reference, verseText },
  });
  await streamWithAI(mode, messages, onChunk, signal);
}

// ─── Tab Button ─────────────────────────────────────────────────────────────

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-1.5 rounded-xl text-sm font-bold transition-all flex-shrink-0",
        active ? "bg-gold-500 text-navy-900 shadow-md" : "bg-white/8 text-white/60 hover:bg-white/15 hover:text-white"
      )}
    >
      {label}
    </button>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function BiblePopup({ reference, onClose, onOpenReader }: BiblePopupProps) {
  if (!reference) return null;
  return <BiblePopupInner reference={reference} onClose={onClose} onOpenReader={onOpenReader} />;
}

function BiblePopupInner({ reference, onClose, onOpenReader }: { reference: string; onClose: () => void; onOpenReader?: (ref: string) => void; }) {
  const [activeTab, setActiveTab] = useState<InlineTab>("afr");
  const [cache, setCache] = useState<Partial<Record<InlineTab, VerseData>>>({});
  const [loading, setLoading] = useState<Partial<Record<InlineTab, boolean>>>({ afr: true });
  const [tabErr, setTabErr] = useState<Partial<Record<InlineTab, string>>>({});
  const [online, setOnline] = useState(navigator.onLine);
  const [showAi, setShowAi] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCollapsed, setAiCollapsed] = useState(false);
  const [aiMode, setAiMode] = useState<AIMode>(getStoredMode);
  const [showBGMenu, setShowBGMenu] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const aiBodyRef = useRef<HTMLDivElement>(null);

  const handleModeChange = (mode: AIMode) => {
    setAiMode(mode); storeMode(mode);
    if (showAi && !aiLoading) { setAiText(""); setAiError(null); handleAskAIWithMode(mode); }
  };

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const fetchVerse = useCallback(async (tab: InlineTab) => {
    if (cache[tab]) return;
    setLoading((p) => ({ ...p, [tab]: true }));
    setTabErr((p) => ({ ...p, [tab]: undefined }));
    try {
      const result = await fetchFromBibleApi(reference, tab);
      if (result) setCache((p) => ({ ...p, [tab]: result }));
      else setTabErr((p) => ({ ...p, [tab]: tab === "xho" ? "Xhosa Bible not installed. Download in Settings → Bible Languages." : "Vers nie gevind nie." }));
    } catch { setTabErr((p) => ({ ...p, [tab]: "Kon nie vers laai nie." })); }
    finally { setLoading((p) => ({ ...p, [tab]: false })); }
  }, [reference, cache]);

  useEffect(() => { fetchVerse("afr"); }, [reference, fetchVerse]);
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const handleTab = (tab: InlineTab) => { setActiveTab(tab); fetchVerse(tab); };

  // ── Copy ──
  const handleCopy = async () => {
    const d = cache[activeTab];
    if (!d) return;
    const text = `${d.reference} (${d.translation})\n\n${d.verses.map((v) => `${v.verse} ${v.text}`).join("\n")}`;
    await navigator.clipboard.writeText(text);
    showToast("Copied!", { type: "success" });
  };

  // ── Share verse ──
  const handleShare = () => {
    const d = cache[activeTab];
    if (!d) return;
    const text = formatVerseMessage({
      reference: d.reference,
      text: d.verses.map((v) => v.text).join(" "),
      translation: d.translation,
    });
    shareOrCopy(text, (msg) => showToast(msg));
  };

  // ── Highlight (save to store) ──
  const handleHighlight = () => {
    const d = cache[activeTab];
    if (!d) return;
    // Dispatch custom event that StudyPage / other components listen for
    window.dispatchEvent(new CustomEvent("joy:highlight-verse", {
      detail: {
        reference: d.reference,
        text: d.verses.map((v) => v.text).join(" "),
        translation: d.translation,
      }
    }));
    showToast("Added to highlights", { type: "success" });
  };

  // ── AI ──
  const handleAskAIWithMode = async (mode: AIMode) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const d = cache[activeTab] ?? cache["afr"];
    const verseText = d?.verses.map((v) => v.text).join(" ") ?? reference;
    setShowAi(true); setAiCollapsed(false); setAiText(""); setAiError(null); setAiLoading(true);
    try {
      await streamTheologyAI(reference, verseText, mode, (chunk) => {
        setAiText((prev) => prev + chunk);
        requestAnimationFrame(() => { if (aiBodyRef.current) aiBodyRef.current.scrollTop = aiBodyRef.current.scrollHeight; });
      }, abortRef.current.signal);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setAiError((e as Error).message ?? "AI request failed.");
    } finally { setAiLoading(false); }
  };

  const handleAskAI = () => handleAskAIWithMode(aiMode);
  const handleStopAI = () => { abortRef.current?.abort(); setAiLoading(false); };

  const cur = cache[activeTab];
  const curLoad = loading[activeTab];
  const curErr = tabErr[activeTab];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-navy-800 rounded-t-2xl shadow-2xl"
        style={{ maxHeight: "88dvh", paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)" }}
        role="dialog" aria-modal="true" aria-label={`Scripture: ${reference}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pb-3 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-gold-500 text-xs font-bold tracking-widest uppercase mb-1">Scripture</p>
            <h2 className="text-white text-xl font-bold leading-tight pr-4">{reference}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 mt-1" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Translation tabs row */}
        <div
          className="flex items-center gap-2 px-5 pb-3 flex-shrink-0"
          style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          <TabBtn label="AFR" active={activeTab === "afr"} onClick={() => handleTab("afr")} />
          <TabBtn label="KJV" active={activeTab === "kjv"} onClick={() => handleTab("kjv")} />
          <TabBtn label="WEB" active={activeTab === "web"} onClick={() => handleTab("web")} />
          <TabBtn label="XHO" active={activeTab === "xho"} onClick={() => handleTab("xho")} />

          <div className="w-px h-6 bg-white/15 mx-1 flex-shrink-0" />

          {/* Bible Gateway dropdown — always GNB first */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowBGMenu((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold bg-white/8 text-white/60 hover:bg-white/15 hover:text-white transition-all"
            >
              <ExternalLink size={12} />
              <span>More</span>
              <ChevronDown size={11} className={cn("transition-transform", showBGMenu && "rotate-180")} />
            </button>
            {showBGMenu && (
              <div className="absolute top-full left-0 mt-1 z-10 min-w-[130px] rounded-xl bg-navy-700 border border-white/10 shadow-xl overflow-hidden">
                {BG_TRANSLATIONS.map((t) => (
                  <a
                    key={t.id}
                    href={bibleGatewayUrl(reference, t.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowBGMenu(false)}
                    className="flex items-center justify-between px-3 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <span className="font-semibold">{t.label}</span>
                    <ExternalLink size={11} className="text-white/30" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {!online && (
            <div className="flex items-center gap-1 text-white/40 flex-shrink-0 ml-1">
              <WifiOff size={12} /><span className="text-xs">Offline</span>
            </div>
          )}
        </div>

        {/* Verse content */}
        <div className="flex-1 overflow-y-auto px-5 space-y-3 pb-2" style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
          <div className="bg-navy-700/60 rounded-xl p-4 min-h-[80px]">
            {curLoad ? (
              <div className="flex items-center justify-center py-8"><Loader2 size={24} className="animate-spin text-gold-400" /></div>
            ) : curErr ? (
              <div className="text-center py-4"><p className="text-white/50 text-sm">{curErr}</p></div>
            ) : cur ? (
              <div className="space-y-3">
                {cur.verses.map((v) => (
                  <p key={v.verse} className="text-white leading-relaxed">
                    <sup className="text-gold-400 font-bold text-xs mr-1.5 select-none">{v.verse}</sup>
                    {v.text}
                  </p>
                ))}
                <p className="text-white/25 text-xs text-right mt-1">{cur.translation}</p>
              </div>
            ) : null}
          </div>

          {/* AI Study panel */}
          {showAi && (
            <div className="bg-navy-700/80 border border-gold-500/20 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles size={13} className="text-gold-400" />
                  <span className="text-gold-400 text-xs font-bold tracking-wide uppercase">AI Study</span>
                  {aiLoading && <Loader2 size={11} className="animate-spin text-gold-400/60 ml-1" />}
                  <div className="flex items-center rounded-lg bg-white/8 p-0.5 ml-1">
                    {(["normal", "deep"] as AIMode[]).map((m) => (
                      <button key={m} onClick={() => handleModeChange(m)}
                        className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-all", aiMode === m ? "bg-gold-500 text-navy-900" : "text-white/40 hover:text-white/60")}>
                        {m === "normal" ? "Normal" : "Deep"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {aiLoading && <button onClick={handleStopAI} className="text-white/40 hover:text-white/70 text-xs transition-colors">Stop</button>}
                  <button onClick={() => setAiCollapsed((c) => !c)} className="text-white/40 hover:text-white/70 transition-colors">
                    {aiCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </button>
                </div>
              </div>
              {!aiCollapsed && (
                <div ref={aiBodyRef} className="px-4 py-3 space-y-0.5" style={{ maxHeight: "50dvh", overflowY: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
                  {aiError ? <p className="text-red-400 text-sm">{aiError}</p>
                    : aiText ? <MarkdownBlock text={aiText} />
                    : aiLoading ? <p className="text-white/40 text-sm italic animate-pulse">Studying the scripture…</p>
                    : null}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Bottom action bar ── */}
        <div className="flex items-center gap-2 px-4 pt-3 border-t border-white/8 flex-shrink-0">
          {/* Ask AI — primary, left side */}
          <button
            onClick={handleAskAI}
            disabled={aiLoading}
            className={cn(
              "flex items-center gap-1.5 flex-1 justify-center py-2.5 rounded-xl text-sm font-bold transition-all",
              showAi ? "bg-gold-500/25 text-gold-300 border border-gold-500/50" : "bg-gold-500/15 text-gold-400 hover:bg-gold-500/25",
              aiLoading && "opacity-70 cursor-not-allowed"
            )}
          >
            {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>{aiLoading ? "Thinking…" : "Ask AI"}</span>
          </button>

          {/* Share verse */}
          <button
            onClick={handleShare}
            disabled={!cur}
            className="flex items-center gap-1.5 flex-1 justify-center py-2.5 rounded-xl text-sm font-semibold bg-white/8 text-white/70 hover:bg-white/15 hover:text-white transition-all disabled:opacity-30"
          >
            <Share2 size={14} /><span>Share</span>
          </button>

          {/* Copy */}
          <button
            onClick={handleCopy}
            disabled={!cur}
            className="flex items-center gap-1.5 flex-1 justify-center py-2.5 rounded-xl text-sm font-semibold bg-white/8 text-white/70 hover:bg-white/15 hover:text-white transition-all disabled:opacity-30"
          >
            <Copy size={14} /><span>Copy</span>
          </button>

          {/* Highlight / save */}
          <button
            onClick={handleHighlight}
            disabled={!cur}
            className="flex items-center gap-1.5 flex-1 justify-center py-2.5 rounded-xl text-sm font-semibold bg-white/8 text-white/70 hover:bg-white/15 hover:text-white transition-all disabled:opacity-30"
          >
            <Bookmark size={14} /><span>Save</span>
          </button>
        </div>

        {/* Open in Reader (optional) */}
        {onOpenReader && (
          <div className="px-4 pb-1 pt-1 flex-shrink-0">
            <button
              onClick={() => { onOpenReader(reference); onClose(); }}
              className="flex items-center gap-2 w-full justify-center py-2 rounded-xl text-xs font-semibold text-gold-400/60 hover:text-gold-400 transition-colors"
            >
              <BookOpen size={12} /><span>Open in Bible Reader</span>
            </button>
          </div>
        )}
      </div>

      {/* Close BG menu on outside click */}
      {showBGMenu && <div className="fixed inset-0 z-[49]" onClick={() => setShowBGMenu(false)} />}
    </>
  );
}
