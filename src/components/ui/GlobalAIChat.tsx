"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, ChevronDown, Square } from "lucide-react";
import { useTheme } from "@/components/ui/ThemeProvider";
import { MarkdownBlock } from "@/components/ui/MarkdownBlock";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import {
  streamWithAI,
  buildMessages,
  getStoredMode,
  storeMode,
  type ChatMessage,
  type AIMode,
  type AIContext,
} from "@/lib/aiProvider";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Optional context so "Ask AI" from a study knows where the reader is. */
  context?: AIContext;
}

const HISTORY_KEY = "joy-ai-chat-history";

const STARTERS = [
  "Explain the Sabbath",
  "What happens when we die?",
  "How can I know I'm saved?",
];

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

export function GlobalAIChat({ open, onClose, context }: Props) {
  const { isDark } = useTheme();
  const bibleBookmark = useAppStore((s) => s.bibleBookmark);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(loadHistory);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<AIMode>(getStoredMode);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleModeChange = (m: AIMode) => {
    setMode(m);
    storeMode(m);
  };

  // Persist history across sessions (chat is no longer wiped on close).
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
    } catch {
      /* storage full / unavailable — non-fatal */
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const clearChat = () => {
    setMessages([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* non-fatal */
    }
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const history = messages;
    const withUser = [...history, userMsg];
    // Add an empty assistant message we stream into.
    setMessages([...withUser, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const apiMessages = buildMessages({
      task: "chat",
      mode,
      context,
      translation: bibleBookmark?.translation,
      history,
      userText: text,
    });

    let acc = "";
    try {
      await streamWithAI(
        mode,
        apiMessages,
        (chunk) => {
          acc += chunk;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: acc };
            return next;
          });
        },
        controller.signal,
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        if (!acc) {
          setMessages((prev) => prev.slice(0, -1));
        }
      } else {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: `Sorry, something went wrong: ${
              err instanceof Error ? err.message : "Unknown error"
            }`,
          };
          return next;
        });
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const handleSend = () => send(input);
  const handleStop = () => abortRef.current?.abort();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex flex-col">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        className={cn(
          "relative z-10 mt-auto w-full max-w-lg mx-auto",
          "flex flex-col max-h-[85dvh]",
          "rounded-t-3xl safe-bottom animate-slide-up",
          isDark ? "bg-navy-700" : "bg-elevated",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-theme">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-gold-500" />
            <span className="text-sm font-semibold">Ask AI</span>
            {/* Normal / Deep toggle */}
            <div className="flex items-center rounded-lg bg-gold-500/8 p-0.5 ml-1">
              {(["normal", "deep"] as AIMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => handleModeChange(m)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-all",
                    mode === m
                      ? "bg-gold-500 text-navy-900"
                      : "text-gold-500/50 hover:text-gold-500/80",
                  )}
                >
                  {m === "normal" ? "Normal" : "Deep"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
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

        {/* Mode subtitle */}
        <div className="px-5 pt-2 text-2xs text-muted">
          {mode === "deep"
            ? "Deep — a full, structured study answer."
            : "Normal — a quick, focused answer."}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-hide">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Sparkles size={28} className="text-gold-500/30" />
              <p className="text-muted text-sm">Ask any Bible or faith question.</p>
              <p className="text-muted text-xs max-w-[240px]">
                Grounded in Scripture and Adventist teaching, with verse references.
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-gold-500/25 bg-gold-500/5 px-3 py-1.5 text-[12px] font-medium text-gold-500 active:scale-[0.97]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "rounded-2xl px-4 py-3 text-[14px] leading-[1.7]",
                msg.role === "user"
                  ? "ml-8 bg-gold-500/10 text-secondary whitespace-pre-line"
                  : cn("mr-4", isDark ? "bg-navy-800/70" : "bg-surface"),
              )}
            >
              {msg.role === "assistant" ? (
                <>
                  <p className="text-2xs font-bold text-gold-500/60 mb-1">
                    <Sparkles size={9} className="inline mr-1" />
                    AI
                  </p>
                  {msg.content ? (
                    <MarkdownBlock text={msg.content} />
                  ) : (
                    <Loader2 size={16} className="animate-spin text-gold-500" />
                  )}
                </>
              ) : (
                msg.content
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Trust line */}
        <div className="px-5 pb-1 text-center text-[10px] text-muted">
          AI can make mistakes — always weigh answers against Scripture and your church family.
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
              placeholder={mode === "deep" ? "Ask for a deep study…" : "Ask a Bible question…"}
              className="input flex-1 !rounded-xl !py-2.5"
              disabled={loading}
            />
            {loading ? (
              <button
                onClick={handleStop}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/20 text-gold-500 active:scale-[0.93]"
                aria-label="Stop"
              >
                <Square size={15} />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500 text-navy-900 active:scale-[0.93] disabled:opacity-30"
                aria-label="Send"
              >
                <Send size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
