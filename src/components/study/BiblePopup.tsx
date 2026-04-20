import { useEffect, useRef, useState, useCallback } from "react";
import { X, Copy, Check, Loader2, BookOpen, WifiOff } from "lucide-react";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";
import {
  lookupReference,
  type TranslationId,
  type VerseResult,
} from "@/lib/localBible";
import { GlobalAIChat } from "@/components/ui/GlobalAIChat";

const LOCAL_TRANSLATIONS: { id: TranslationId; name: string }[] = [
  { id: "kjv", name: "KJV" },
  { id: "web", name: "WEB" },
  { id: "asv", name: "ASV" },
];

const ONLINE_TRANSLATIONS: { id: string; name: string; gatewayId: string }[] = [
  { id: "esv", name: "ESV", gatewayId: "ESV" },
  { id: "nlt", name: "NLT", gatewayId: "NLT" },
];

const bibleGatewayUrl = (ref: string, version: string) =>
  `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=${version}`;

interface Props {
  reference: string | null;
  onClose: () => void;
  onOpenReader?: (reference: string) => void;
  initialVerse?: string;
  systemPrompt?: string;
}

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; data: Map<TranslationId, VerseResult> }
  | { status: "error"; message: string };

export function BiblePopup({
  reference,
  onClose,
  onOpenReader,
  initialVerse,
  systemPrompt,
}: Props) {
  const { isDark } = useTheme();
  const isOnline = useOnlineStatus();
  const backdropRef = useRef<HTMLDivElement>(null);
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle" });
  const [activeTab, setActiveTab] = useState<TranslationId>("kjv");
  const [copied, setCopied] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Fetch verse when reference or tab changes
  useEffect(() => {
    if (!reference) return;
    setFetchState({ status: "loading" });

    lookupReference(reference, activeTab)
      .then((result) => {
        const map = new Map<TranslationId, VerseResult>();
        map.set(activeTab, result);
        setFetchState({ status: "loaded", data: map });
      })
      .catch(() => setFetchState({ status: "error", message: "Could not load verse" }));
  }, [reference, activeTab]);

  const handleTabSwitch = useCallback((tab: TranslationId) => {
    setActiveTab(tab);
  }, []);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!reference) return null;

  const currentVerse = fetchState.status === "loaded" ? fetchState.data.get(activeTab) : null;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === backdropRef.current) onClose();
        }}
      >
        {/* Popup Content */}
        <div
          className={cn(
            "w-full max-w-2xl rounded-3xl shadow-2xl border max-h-[90vh] flex flex-col overflow-hidden",
            isDark ? "bg-navy-950 border-gold-500/30" : "bg-white border-gray-200"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-gold-500" />
              <div>
                <h2 className="font-bold text-xl">{reference}</h2>
                <p className="text-xs text-muted-foreground">Bible Verse</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isOnline && (
                <div className="flex items-center gap-1 text-amber-500 text-xs font-medium">
                  <WifiOff className="w-4 h-4" />
                  Offline
                </div>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-surface rounded-2xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Translation Tabs */}
          <div className="flex gap-1 px-6 pt-4 pb-3 overflow-x-auto scrollbar-hide border-b">
            {LOCAL_TRANSLATIONS.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTabSwitch(t.id)}
                className={cn(
                  "rounded-2xl px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all shrink-0",
                  activeTab === t.id
                    ? "bg-gold-500 text-navy-900 shadow-gold-glow"
                    : "bg-surface text-muted hover:bg-surface/80"
                )}
              >
                {t.name}
              </button>
            ))}

            {ONLINE_TRANSLATIONS.map((t) => (
              <a
                key={t.id}
                href={bibleGatewayUrl(reference, t.gatewayId)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl px-4 py-1.5 text-xs font-bold uppercase tracking-wider bg-surface text-muted hover:bg-surface/80 shrink-0 flex items-center gap-1"
              >
                {t.name} <span className="text-[10px]">↗</span>
              </a>
            ))}
          </div>

          {/* Verse Content */}
          <div className="flex-1 p-6 overflow-auto">
            {fetchState.status === "loading" && (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                Loading verse...
              </div>
            )}

            {fetchState.status === "error" && (
              <div className="text-red-500 text-center py-8">{fetchState.message}</div>
            )}

            {currentVerse && (
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-lg leading-relaxed whitespace-pre-line">{currentVerse.text}</p>
                <p className="text-xs text-muted-foreground mt-6 text-right">
                  — {currentVerse.translation.toUpperCase()}
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t p-4 flex items-center justify-between">
            <button
              onClick={() => currentVerse && copyToClipboard(`${reference} — ${currentVerse.text}`)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl hover:bg-surface transition-colors text-sm font-medium"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy verse"}
            </button>

            <div className="flex items-center gap-3">
              {onOpenReader && (
                <button
                  onClick={() => {
                    onOpenReader(reference);
                    onClose();
                  }}
                  className="px-6 py-3 bg-surface hover:bg-surface/80 rounded-2xl text-sm font-medium transition-colors"
                >
                  Open in Reader
                </button>
              )}

              <button
                onClick={() => setShowAIChat(true)}
                className="px-6 py-3 bg-gold-500 hover:bg-gold-600 text-navy-900 rounded-2xl text-sm font-bold transition-colors flex items-center gap-2"
              >
                Ask AI about this verse
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Chat Modal */}
      <GlobalAIChat
        open={showAIChat}
        onClose={() => setShowAIChat(false)}
        initialVerse={initialVerse || reference}
        systemPrompt={systemPrompt}
      />
    </>
  );
}
