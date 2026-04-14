import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, ChevronDown, Settings } from "lucide-react";
import { useTheme } from "@/components/ui/ThemeProvider";
import { cn } from "@/lib/utils";
import {
  chatWithAI,
  getStoredProvider,
  hasAnyKey,
  PROVIDERS,
  type ChatMessage,
  type ProviderId,
} from "@/lib/aiProvider";
import { AIKeySetup } from "@/components/ui/AIKeySetup";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function GlobalAIChat({ open, onClose }: Props) {
  const { isDark } = useTheme();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const handleSend = async (providerId?: ProviderId) => {
    const text = input.trim();
    if (!text) return;

    const pid = providerId ?? getStoredProvider();
    if (!pid || !hasAnyKey()) {
      setShowSetup(true);
      return;
    }

    const userMsg: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const reply = await chatWithAI(pid, newMessages, controller.signal);
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setMessages([
        ...newMessages,
        { role: "assistant", content: `Sorry, something went wrong: ${err instanceof Error ? err.message : "Unknown error"}` },
      ]);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const providerName = (() => {
    const pid = getStoredProvider();
    return PROVIDERS.find((p) => p.id === pid)?.name ?? "AI";
  })();

  if (!open && !showSetup) return null;

  return (
    <>
      {showSetup && (
        <AIKeySetup
          onComplete={(pid) => { setShowSetup(false); handleSend(pid); }}
          onSkip={() => setShowSetup(false)}
        />
      )}

      {open && (
        <div className="fixed inset-0 z-[150] flex flex-col">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />

          <div className={cn(
            "relative z-10 mt-auto w-full max-w-lg mx-auto",
            "flex flex-col max-h-[75dvh]",
            "rounded-t-3xl safe-bottom animate-slide-up",
            isDark ? "bg-navy-700" : "bg-elevated",
          )}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-theme">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-900">
                  <Sparkles size={12} className="text-white" />
                </div>
                <span className="text-sm font-semibold">Ask AI</span>
                {hasAnyKey() && (
                  <span className="text-muted text-2xs">via {providerName}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowSetup(true)}
                  className="rounded-lg p-2 active:opacity-70"
                  aria-label="AI settings"
                >
                  <Settings size={15} className="text-muted" />
                </button>
                {messages.length > 0 && (
                  <button
                    onClick={() => setMessages([])}
                    className="rounded-lg px-2 py-1 text-2xs font-semibold text-muted active:opacity-70"
                  >
                    Clear
                  </button>
                )}
                <button onClick={onClose} className="rounded-full p-2 active:opacity-70">
                  <ChevronDown size={18} className="text-muted" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-hide">
              {messages.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-900/80">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <p className="text-secondary text-sm font-semibold">Bible Study Assistant</p>
                  <p className="text-muted text-xs max-w-[240px]">
                    Ask any Bible or faith question. I'll answer in plain English with Scripture references.
                  </p>
                  {!hasAnyKey() && (
                    <button onClick={() => setShowSetup(true)} className="btn-primary !py-2 !px-4 text-sm mt-2">
                      <Sparkles size={14} /> Connect AI Provider
                    </button>
                  )}
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-2xl px-4 py-3 text-[14px] leading-[1.7] whitespace-pre-line",
                    msg.role === "user"
                      ? "ml-8 bg-gold-500/10 text-secondary"
                      : cn("mr-4", isDark ? "bg-navy-800/70" : "bg-surface", "text-secondary"),
                  )}
                >
                  {msg.role === "assistant" && (
                    <p className="text-2xs font-bold text-gold-500/60 mb-1">
                      <Sparkles size={9} className="inline mr-1" />{providerName}
                    </p>
                  )}
                  {msg.content}
                </div>
              ))}

              {loading && (
                <div className={cn("mr-4 rounded-2xl px-4 py-3 flex items-center gap-2", isDark ? "bg-navy-800/70" : "bg-surface")}>
                  <Loader2 size={16} className="animate-spin text-gold-500" />
                  <span className="text-muted text-sm">Thinking…</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-theme px-4 py-3">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a Bible question…"
                  className="input flex-1 !rounded-xl !py-2.5"
                  disabled={loading}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500 text-navy-900 active:scale-[0.93] disabled:opacity-30"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
