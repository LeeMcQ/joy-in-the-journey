/* ================================================================== */
/*  AI Provider System                                                */
/*  4 providers: Groq & OpenRouter (free) first, Claude & ChatGPT     */
/*  API keys stored in localStorage, never sent except to provider    */
/* ================================================================== */

export type ProviderId = "groq" | "openrouter" | "claude" | "chatgpt";

export interface Provider {
  id: ProviderId;
  name: string;
  model: string;
  tier: "free" | "paid";
  emoji: string;
  keyUrl: string;
  keyHint: string;
  endpoint: string;
}

export const PROVIDERS: Provider[] = [
  {
    id: "groq",
    name: "Groq",
    model: "llama-3.3-70b-versatile",
    tier: "free",
    emoji: "⚡",
    keyUrl: "https://console.groq.com/keys",
    keyHint: "Get a free key at console.groq.com — no credit card needed.",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    model: "meta-llama/llama-3.1-8b-instruct:free",
    tier: "free",
    emoji: "🌐",
    keyUrl: "https://openrouter.ai/keys",
    keyHint: "Get a free key at openrouter.ai/keys — free models available.",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
  },
  {
    id: "claude",
    name: "Claude",
    model: "claude-sonnet-4-20250514",
    tier: "paid",
    emoji: "🟤",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyHint: "Get your API key at console.anthropic.com",
    endpoint: "https://api.anthropic.com/v1/messages",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    model: "gpt-4o-mini",
    tier: "paid",
    emoji: "🟢",
    keyUrl: "https://platform.openai.com/api-keys",
    keyHint: "Get your API key at platform.openai.com",
    endpoint: "https://api.openai.com/v1/chat/completions",
  },
];

/* ── Key storage ──────────────────────────────────────── */

const STORAGE_PREFIX = "joy-ai-";

export function getStoredKey(providerId: ProviderId): string | null {
  return localStorage.getItem(`${STORAGE_PREFIX}key-${providerId}`);
}

export function storeKey(providerId: ProviderId, key: string): void {
  localStorage.setItem(`${STORAGE_PREFIX}key-${providerId}`, key);
}

export function getStoredProvider(): ProviderId | null {
  return localStorage.getItem(`${STORAGE_PREFIX}provider`) as ProviderId | null;
}

export function storeProvider(providerId: ProviderId): void {
  localStorage.setItem(`${STORAGE_PREFIX}provider`, providerId);
}

export function hasAnyKey(): boolean {
  return PROVIDERS.some((p) => !!getStoredKey(p.id));
}

/* ── System prompt ────────────────────────────────────── */

const SYSTEM_PROMPT = `You are a warm, knowledgeable Christian Bible study assistant. Your role is to help people understand Scripture and deepen their faith.

Guidelines:
- Be Christian-driven and Scripture-first in every answer
- Use plain English — explain things like you're talking to a 12-year-old
- Keep answers short, clear, and focused (1-2 paragraphs max)
- Always include Bible references when possible (e.g. John 3:16)
- Be professional, encouraging, and kind
- When expanding on someone's thoughts, affirm what's good, gently correct if needed, and always point back to Scripture
- You are Seventh-day Adventist in theology but respectful of all Christians
- Never be preachy or condescending — be a study companion, not a lecturer
- Always call people back to simple bible obedience — and always anchor the conclusion in truth as revealed in Scripture or affirmed by Ellen G. White's writings where applicable`

/* ── Build contextual prompt for per-question AI ──────── */

export function buildQuestionPrompt(context: {
  studyTitle: string;
  studyIntro: string;
  questionText: string;
  scriptureRef: string;
  studyNote?: string;
  userAnswer: string;
}): string {
  let prompt = `I'm studying "${context.studyTitle}".\n\n`;
  prompt += `The study introduction says: "${context.studyIntro.slice(0, 300)}"\n\n`;
  prompt += `Question: ${context.questionText}\n`;
  prompt += `Scripture: ${context.scriptureRef}\n`;
  if (context.studyNote) {
    prompt += `Study note: ${context.studyNote.slice(0, 300)}\n`;
  }
  prompt += `\nMy thoughts: "${context.userAnswer}"\n\n`;
  prompt += `Please help me understand this better. Expand on my thoughts, explain the Scripture, and help me go deeper. If my understanding needs correction, gently guide me with Bible references.` 
  return prompt;
}

/* ── Chat with AI ─────────────────────────────────────── */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function chatWithAI(
  providerId: ProviderId,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  if (!provider) throw new Error("Unknown provider");

  const apiKey = getStoredKey(providerId);
  if (!apiKey) throw new Error("No API key configured");

  if (providerId === "claude") {
    return callClaude(provider, apiKey, messages, signal);
  }
  return callOpenAICompatible(provider, apiKey, messages, signal);
}

/* ================================================== */
/*  GROQ API KEY SETUP — SECURE VERSION               */
/*  Key is stored ONLY in your browser (never on GitHub) */
/* ================================================== */

// No default key is hardcoded anymore.
// The user sets their own key once in "More → AI Settings"
/* ── OpenAI-compatible (Groq, OpenRouter, ChatGPT) ────── */

async function callOpenAICompatible(
  provider: Provider,
  apiKey: string,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  if (provider.id === "openrouter") {
    headers["HTTP-Referer"] = window.location.origin;
    headers["X-Title"] = "Joy in the Journey";
  }

  const res = await fetch(provider.endpoint, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({
      model: provider.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${provider.name} error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "No response received.";
}

/* ── Claude (Anthropic API) ───────────────────────────── */

async function callClaude(
  provider: Provider,
  apiKey: string,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(provider.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    signal,
    body: JSON.stringify({
      model: provider.model,
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Claude error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? "No response received.";
}
