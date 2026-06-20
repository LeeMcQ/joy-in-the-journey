"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, ChevronDown } from "lucide-react";
import { useTheme } from "@/components/ui/ThemeProvider";
import { cn } from "@/lib/utils";
import {
  chatWithAI,
  getStoredMode,
  storeMode,
  type ChatMessage,
  type AIMode,
} from "@/lib/aiProvider";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function GlobalAIChat({ open, onClose }: Props) {
  const { isDark } = useTheme();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<AIMode>(getStoredMode);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleModeChange = (m: AIMode) => {
    setMode(m);
    storeMode(m);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setMessages([]);
      setInput("");
    }
  }, [open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const reply = await chatWithAI(mode, newMessages, controller.signal);
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: `Sorry, something went wrong: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        },
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex flex-col">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        className={cn(
          "relative z-10 mt-auto w-full max-w-lg mx-auto",
          "flex flex-col max-h-[85dvh]",
          "rounded-t-3xl safe-bottom animate-slide-up",
          isDark ? "bg-navy-700" : "bg-elevated"
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
                      : "text-gold-500/50 hover:text-gold-500/80"
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
              <Sparkles size={28} className="text-gold-500/30" />
              <p className="text-muted text-sm">Ask any Bible or faith question.</p>
              <p className="text-muted text-xs max-w-[240px]">
                I'll answer in plain English with Scripture references.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "rounded-2xl px-4 py-3 text-[14px] leading-[1.7] whitespace-pre-line",
                msg.role === "user"
                  ? "ml-8 bg-gold-500/10 text-secondary"
                  : cn("mr-4", isDark ? "bg-navy-800/70" : "bg-surface", "text-secondary")
              )}
            >
              {msg.role === "assistant" && (
                <p className="text-2xs font-bold text-gold-500/60 mb-1">
                  <Sparkles size={9} className="inline mr-1" />
                  AI
                </p>
              )}
              {msg.content}
            </div>
          ))}

          {loading && (
            <div className={cn("mr-4 rounded-2xl px-4 py-3", isDark ? "bg-navy-800/70" : "bg-surface")}>
              <Loader2 size={16} className="animate-spin text-gold-500" />
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
              placeholder={mode === "deep" ? "Ask for deep research…" : "Ask a Bible question…"}
              className="input flex-1 !rounded-xl !py-2.5"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500 text-navy-900 active:scale-[0.93] disabled:opacity-30"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
