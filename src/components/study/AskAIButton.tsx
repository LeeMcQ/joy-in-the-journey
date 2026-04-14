import { useState, useRef } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  chatWithAI,
  buildQuestionPrompt,
  getStoredProvider,
  hasAnyKey,
  PROVIDERS,
  type ProviderId,
} from "@/lib/aiProvider";
import { AIKeySetup } from "@/components/ui/AIKeySetup";

interface Props {
  studyTitle: string;
  studyIntro: string;
  questionText: string;
  scriptureRef: string;
  studyNote?: string;
  userAnswer: string;
}

export function AskAIButton({
  studyTitle,
  studyIntro,
  questionText,
  scriptureRef,
  studyNote,
  userAnswer,
}: Props) {
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleAsk = async (providerId?: ProviderId) => {
    const pid = providerId ?? getStoredProvider();
    if (!pid || !hasAnyKey()) {
      setShowSetup(true);
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const prompt = buildQuestionPrompt({
        studyTitle,
        studyIntro,
        questionText,
        scriptureRef,
        studyNote,
        userAnswer: userAnswer || "(No thoughts written yet)",
      });

      const result = await chatWithAI(pid, [{ role: "user", content: prompt }], controller.signal);
      setResponse(result);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  const providerName = (() => {
    const pid = getStoredProvider();
    return PROVIDERS.find((p) => p.id === pid)?.name ?? "AI";
  })();

  return (
    <>
      {showSetup && (
        <AIKeySetup
          onComplete={(pid) => { setShowSetup(false); handleAsk(pid); }}
          onSkip={() => setShowSetup(false)}
        />
      )}

      <div className="mt-2">
        {/* Ask AI button */}
        {!response && !loading && (
          <button
            onClick={() => handleAsk()}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2",
              "text-[12px] font-semibold transition-all active:scale-[0.97]",
              "bg-gold-500/10 text-gold-500 hover:bg-gold-500/15",
            )}
          >
            <Sparkles size={13} /> Ask AI
          </button>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 rounded-lg bg-gold-500/5 px-3 py-2">
            <Loader2 size={14} className="animate-spin text-gold-500" />
            <span className="text-muted text-[12px]">Thinking…</span>
            <button onClick={handleCancel} className="ml-auto rounded p-1 active:opacity-70">
              <X size={12} className="text-muted" />
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
            <p className="text-red-400 text-[12px]">{error}</p>
            <button
              onClick={() => { setError(null); handleAsk(); }}
              className="mt-1 text-[11px] font-semibold text-gold-500 active:opacity-70"
            >
              Try again
            </button>
          </div>
        )}

        {/* AI Response */}
        {response && (
          <div className="animate-slide-up rounded-xl border border-gold-500/20 bg-gold-500/[0.04] p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-2xs font-bold uppercase tracking-caps text-gold-500">
                <Sparkles size={10} className="inline mr-1" />
                {providerName} Response
              </span>
              <button
                onClick={() => setResponse(null)}
                className="rounded p-1 active:opacity-70"
              >
                <X size={12} className="text-muted" />
              </button>
            </div>
            <div className="text-secondary text-[14px] leading-[1.8] whitespace-pre-line">
              {response}
            </div>
            <button
              onClick={() => { setResponse(null); handleAsk(); }}
              className="mt-3 text-[11px] font-semibold text-gold-500 active:opacity-70"
            >
              <Sparkles size={10} className="inline mr-1" /> Ask again
            </button>
          </div>
        )}
      </div>
    </>
  );
}
