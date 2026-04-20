"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  chatWithAI,
  type ChatMessage,
  type ProviderId,
  getStoredProvider,
} from "@/lib/aiProvider";

interface Props {
  open: boolean;
  onClose: () => void;
  initialVerse?: string;
  systemPrompt?: string;
}

export function GlobalAIChat({ open, onClose, initialVerse, systemPrompt }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider] = useState<ProviderId>(() => getStoredProvider() || "groq");
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortController = useRef<AbortController | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Show welcome screen when opened from main AI icon
  useEffect(() => {
    if (open && messages.length === 0) {
      if (initialVerse) {
        // From BiblePopup
        const welcome: ChatMessage = {
          role: "assistant",
          content: `Hi! I'm here to help you study **${initialVerse}**. ${systemPrompt || "What would you like to explore?"}`,
        };
        setMessages([welcome]);
      } else {
        // Main screen → your original welcome screen
        setMessages([]);
      }
    }
  }, [open, initialVerse, systemPrompt, messages.length]);

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setMessages([]);
      setInput("");
    }
  }, [open]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    if (abortController.current) abortController.current.abort();
    abortController.current = new AbortController();

    try {
      const response = await chatWithAI(
        selectedProvider,
        [...messages, userMessage],
        abortController.current.signal
      );

      const assistantMessage: ChatMessage = { role: "assistant", content: response };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't get a response. Please check your API key." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-[#0a1428] z-[9999] flex flex-col">
      {/* Top Bar */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <span className="text-white font-semibold">Ask AI</span>
            <span className="text-white/60 text-sm ml-1">via {selectedProvider.toUpperCase()}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="text-white/70 hover:text-white text-xl">⚙️</button>
          <button className="text-white/70 hover:text-white text-xl">🎤</button>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6" ref={scrollRef}>
        {/* Original Welcome Screen (when opened from main AI icon) */}
        {messages.length === 0 && !initialVerse && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-8">
              <Sparkles className="w-14 h-14 text-amber-300" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">Bible Study Assistant</h1>
            <p className="text-white/70 max-w-xs leading-relaxed">
              Ask any Bible or faith question. I'll answer in plain English with Scripture references.
            </p>
          </div>
        )}

        {/* Chat Messages */}
        {messages.length > 0 && (
          <div className="space-y-6 max-w-2xl mx-auto">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-3xl px-6 py-4 text-base",
                    msg.role === "user"
                      ? "bg-amber-300 text-[#0a1428]"
                      : "bg-white/10 text-white"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-3 text-white/60">
                <Loader2 className="w-5 h-5 animate-spin" />
                Thinking...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Input Bar */}
      <div className="p-6 border-t border-white/10 bg-[#0a1428]">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask a Bible question..."
            className="flex-1 bg-white/10 border border-white/20 focus:border-amber-300 rounded-3xl px-6 py-5 text-white placeholder:text-white/50 outline-none"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="w-14 h-14 bg-amber-300 hover:bg-amber-400 text-[#0a1428] rounded-3xl flex items-center justify-center transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  );
}