import { useEffect, useRef, useState, useCallback } from "react";
import { X, Copy, Check, Loader2, BookOpen, WifiOff } from "lucide-react";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";
import {
  lookupReference,
  LOCAL_TRANSLATIONS,
  ONLINE_TRANSLATIONS,
  bibleGatewayUrl,
  type TranslationId,
  type VerseResult,
} from "@/lib/localBible";

interface Props {
  reference: string | null;
  onClose: () => void;
  onOpenReader?: (reference: string) => void;
}

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; data: Map<TranslationId, VerseResult> }
  | { status: "error"; message: string };

export function BiblePopup({ reference, onClose, onOpenReader }: Props) {
  const { isDark } = useTheme();
  const isOnline = useOnlineStatus();
  const backdropRef = useRef<HTMLDivElement>(null);
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle" });
  const [activeTab, setActiveTab] = useState<TranslationId>("kjv");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!reference) { setFetchState({ status: "idle" }); return; }
    let cancelled = false;
    setFetchState({ status: "loading" });
    setActiveTab("kjv");
    setCopied(false);

    // Only fetch KJV first — other translations loaded when their tab is tapped
    lookupReference(reference, "kjv")
      .then((result) => {
        if (!cancelled) {
          const data = new Map<TranslationId, VerseResult>();
          data.set("kjv", result);
          setFetchState({ status: "loaded", data });
        }
      })
      .catch((err) => { if (!cancelled) setFetchState({ status: "error", message: String(err) }); });

    return () => { cancelled = true; };
  }, [reference]);

  // Lazy-load other translations when tab is switched
  const handleTabSwitch = useCallback(async (tab: TranslationId) => {
    setActiveTab(tab);
    if (!reference || fetchState.status !== "loaded") return;
    if (fetchState.data.has(tab)) return; // already fetched
    try {
      const result = await lookupReference(reference, tab);
      setFetchState((prev) => {
        if (prev.status !== "loaded") return prev;
        const newData = new Map(prev.data);
        newData.set(tab, result);
        return { ...prev, data: newData };
      });
    } catch {
      // Silently fail — tab will show "not available"
    }
  }, [reference, fetchState]);

  useEffect(() => {
    if (!reference) return;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", handler); };
  }, [reference, onClose]);

  const handleCopy = useCallback(async () => {
    if (!reference || fetchState.status !== "loaded") return;
    const result = fetchState.data.get(activeTab);
    const text = result?.verses?.length
      ? `${result.verses.map((v) => v.text).join(" ")}\n— ${result.reference} (${activeTab.toUpperCase()})`
      : reference;
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [reference, fetchState, activeTab]);

  if (!reference) return null;

  const currentResult = fetchState.status === "loaded" ? fetchState.data.get(activeTab) : null;

  return (
    <div ref={backdropRef} onClick={(e) => { if (e.target === backdropRef.current) onClose(); }} className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" />

      <div className={cn(
        "relative z-10 w-full max-w-lg animate-slide-up",
        "flex max-h-[85dvh] flex-col rounded-t-3xl safe-bottom",
        isDark ? "bg-navy-700" : "bg-elevated",
      )}>
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-muted opacity-30" />
        </div>

        <div className="flex items-start justify-between gap-3 px-5 pb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-2xs font-bold uppercase tracking-caps text-gold-500">Scripture</p>
              {!isOnline && <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-500">Offline</span>}
            </div>
            <h3 className="mt-1 font-scripture text-xl font-bold leading-snug">{reference}</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-2.5 bg-surface active:opacity-70" aria-label="Close">
            <X size={16} className="text-muted" />
          </button>
        </div>

        {/* Translation tabs */}
        <div className="flex gap-1 px-5 pb-3 overflow-x-auto scrollbar-hide">
          {LOCAL_TRANSLATIONS.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabSwitch(t.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all shrink-0",
                activeTab === t.id ? "bg-gold-500 text-navy-900 shadow-gold-glow" : "bg-surface text-muted",
              )}
            >
              {t.name}
            </button>
          ))}
          {/* Online-only translations — open in BibleGateway */}
          {ONLINE_TRANSLATIONS.map((t) => (
            <a
              key={t.id}
              href={bibleGatewayUrl(reference ?? "", t.gatewayId)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider bg-surface text-muted shrink-0 flex items-center gap-1"
            >
              {t.name} <span className="text-[8px] opacity-50">↗</span>
            </a>
          ))}
        </div>

        {/* Verse content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 scrollbar-hide">
          <div className={cn("rounded-2xl p-4", isDark ? "bg-navy-800/70" : "bg-surface")}>
            {fetchState.status === "loading" && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 size={24} className="animate-spin text-gold-500" />
                <p className="text-muted text-sm">Loading verses…</p>
              </div>
            )}

            {fetchState.status === "error" && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <WifiOff size={24} className="text-muted opacity-40" />
                <p className="text-secondary text-sm">Could not load verses</p>
                <p className="text-muted text-xs max-w-[260px]">{fetchState.message}</p>
              </div>
            )}

            {fetchState.status === "loaded" && currentResult && currentResult.verses.length > 0 && (
              <div className="flex flex-col gap-0">
                {currentResult.verses.map((v, i) => (
                  <p key={`${v.chapter}-${v.verse}-${i}`} className="font-scripture text-[15px] leading-[1.9] text-secondary">
                    <sup className="mr-1.5 text-[10px] font-bold text-gold-500/60">{v.verse}</sup>
                    {v.text}
                  </p>
                ))}
              </div>
            )}

            {fetchState.status === "loaded" && (!currentResult || currentResult.verses.length === 0) && (
              <p className="text-muted py-6 text-center text-sm italic">
                {!isOnline ? "This verse hasn't been cached yet. Read it online first." : "Verse not found."}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2.5 border-t border-theme px-5 py-3">
          <button onClick={handleCopy} className={cn("btn-secondary flex-1 text-sm", copied && "!border-gold-500/50 !text-gold-500")}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copied" : "Copy"}
          </button>
          {onOpenReader && (
            <button onClick={() => { onOpenReader(reference); onClose(); }} className="btn-primary flex-1 text-sm">
              <BookOpen size={15} /> Open in Reader
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
