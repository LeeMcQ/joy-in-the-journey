"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ui/ThemeProvider";
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
  const { isDark } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider] = useState<ProviderId>(() => getStoredProvider() || "groq");
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortController = useRef<AbortController | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Pre-load welcome message when opened from Bible Popup
  useEffect(() => {
    if (open && initialVerse && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        role: "assistant",
        content: `Hi! I'm here to help you study **${initialVerse}**. ${systemPrompt || "What would you like to know or explore about this verse?"}`,
      };
      setMessages([welcomeMessage]);
    }
  }, [open, initialVerse, systemPrompt, messages.length]);

  // Reset when chat is closed
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
        { role: "assistant", content: "Sorry, I couldn't get a response right now. Please check your API key or try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Chat Window */}
      <div
        className={cn(
          "fixed bottom-4 right-4 w-full max-w-md h-[560px] flex flex-col rounded-3xl shadow-2xl border z-[60]",
          isDark ? "bg-navy-950 border-gold-500/30" : "bg-white border-gray-200"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gold-500 text-navy-900 rounded-2xl flex items-center justify-center text-xl">
              🤖
            </div>
            <div>
              <h3 className="font-bold text-lg">Joy AI Companion</h3>
              <p className="text-xs text-muted-foreground">Bible study assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface rounded-2xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 space-y-6 bg-[radial-gradient(#f5f5f5_1px,transparent_1px)] dark:bg-[radial-gradient(#1a2533_1px,transparent_1px)] bg-[length:4px_4px]"
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
              <MessageCircle className="w-12 h-12 mb-4" />
              <p className="text-sm font-medium">Ask me anything about the Bible!</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex max-w-[85%]",
                msg.role === "user" ? "ml-auto justify-end" : "mr-auto"
              )}
            >
              <div
                className={cn(
                  "rounded-3xl px-5 py-3 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-gold-500 text-navy-900 rounded-br-none"
                    : "bg-surface text-foreground rounded-bl-none"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Thinking...
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t bg-surface">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about this verse..."
              className="flex-1 bg-background border border-border focus:border-gold-500 rounded-3xl px-6 py-4 text-sm outline-none"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="w-12 h-12 bg-gold-500 hover:bg-gold-600 text-navy-900 rounded-3xl flex items-center justify-center transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-center text-muted-foreground mt-3">
            Powered by {selectedProvider.toUpperCase()} • Answers may vary
          </p>
        </div>
      </div>
    </>
  );
}