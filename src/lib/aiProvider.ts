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
    emoji: "Lightning",
    keyUrl: "https://console.groq.com/keys",
    keyHint: "Get a free key at console.groq.com — no credit card needed.",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    model: "meta-llama/llama-3.1-8b-instruct:free",
    tier: "free",
    emoji: "Globe",
    keyUrl: "https://openrouter.ai/keys",
    keyHint: "Get a free key at openrouter.ai/keys — free models available.",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
  },
  {
    id: "claude",
    name: "Claude",
    model: "claude-sonnet-4-20250514",
    tier: "paid",
    emoji: "Brown Circle",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyHint: "Get your API key at console.anthropic.com",
    endpoint: "https://api.anthropic.com/v1/messages",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    model: "gpt-4o-mini",
    tier: "paid",
    emoji: "Green Circle",
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
  prompt += `Please help me understand this better. Expand on my thoughts, explain the Scripture, and help me go deeper. If my understanding needs correction, gently guide me with Bible references.`;
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
  if (!provider) throw new Error(`Provider ${providerId} not found`);

  const key = getStoredKey(providerId);
  if (!key) throw new Error(`No API key stored for ${provider.name}. Please set it up first.`);

  const isOpenAICompatible = ["groq", "openrouter", "chatgpt"].includes(providerId);

  if (isOpenAICompatible) {
    const headers: HeadersInit = { "Content-Type": "application/json" };

    if (providerId === "openrouter") {
      headers["HTTP-Referer"] = "https://leemcq.github.io/joy-in-the-journey/";
      headers["X-Title"] = "Joy in the Journey";
    }

    headers["Authorization"] = `Bearer ${key}`;

    const res = await fetch(provider.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: provider.model,
        messages,
        temperature: 0.7,
        max_tokens: 1200,
      }),
      signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API error (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "Sorry, I couldn't get a response.";
  } else if (providerId === "claude") {
    const res = await fetch(provider.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: 1200,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
      signal,
    });

    if (!res.ok) throw new Error("Claude API error");

    const data = await res.json();
    return data.content?.[0]?.text || "Sorry, I couldn't get a response.";
  }

  throw new Error("Unsupported provider");
}