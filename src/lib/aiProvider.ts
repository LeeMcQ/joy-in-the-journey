/* ================================================================== */
/*  AI Provider System                                                 */
/*  All calls go through the Cloudflare Worker proxy.                 */
/*  mode "normal"  → /normal  (fast everyday responses)              */
/*  mode "deep"    → /deep    (thorough research-grade responses)     */
/*  No API keys are ever stored or sent from the browser.             */
/* ================================================================== */

const PROXY_URL = (import.meta.env.VITE_AI_PROXY_URL as string | undefined) ?? "";

export type AIMode = "normal" | "deep";

/* ── Mode preference ───────────────────────────────────────────────── */

const MODE_KEY = "joy-ai-mode";

export function getStoredMode(): AIMode {
  return (localStorage.getItem(MODE_KEY) as AIMode | null) ?? "normal";
}

export function storeMode(mode: AIMode): void {
  localStorage.setItem(MODE_KEY, mode);
}

/* ── Legacy stubs (kept so old imports don't break) ────────────────── */
export type ProviderId = "normal" | "deep";
export function getStoredProvider(): AIMode { return getStoredMode(); }
export function storeProvider(id: AIMode): void { storeMode(id); }
export function hasAnyKey(): boolean { return true; }
export function getStoredKey(_: string): string | null { return "proxy"; }
export function storeKey(_a: string, _b: string): void {}

export const PROVIDERS = [
  { id: "normal" as const, name: "Normal", emoji: "⚡", tier: "free" as const, description: "Fast everyday responses" },
  { id: "deep"   as const, name: "Deep",   emoji: "🔬", tier: "free" as const, description: "Thorough research-grade responses" },
];

/* ── Prompt builder for study questions ────────────────────────────── */

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
  prompt += `Adopt a Scripture-first approach in every response without explicitly stating that you are doing so. Explain biblical passages in their immediate and canonical context, connecting them with the broader narrative of Scripture while keeping Christ central. Expand on ideas with cross-references, historical background, and relevant Hebrew or Greek insights where they illuminate the text. Gently correct misunderstandings using clear biblical evidence rather than opinion. Present major theological viewpoints fairly, but conclude with the interpretation that best harmonizes with the full witness of Scripture, emphasizing God's love, justice, redemption, faith, and obedience. Provide practical application for daily Christian living in a clear, conversational, and theologically rigorous style. Limit every response to 100 words maximum and end with: (1) Key Takeaway and (2) Three progressively deeper research questions.`;
  return prompt;
}

/* ── Message type ──────────────────────────────────────────────────── */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/* ── Non-streaming chat ────────────────────────────────────────────── */

export async function chatWithAI(
  mode: AIMode,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  if (!PROXY_URL) throw new Error("AI proxy URL not configured. Set VITE_AI_PROXY_URL.");

  const res = await fetch(`${PROXY_URL}/${mode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, max_tokens: 1200, stream: false }),
    signal,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "Sorry, I couldn't get a response.";
}

/* ── Streaming chat ────────────────────────────────────────────────── */

export async function streamWithAI(
  mode: AIMode,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  signal: AbortSignal,
): Promise<void> {
  if (!PROXY_URL) throw new Error("AI proxy URL not configured. Set VITE_AI_PROXY_URL.");

  const res = await fetch(`${PROXY_URL}/${mode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, max_tokens: 4096, stream: true }),
    signal,
  });

  if (!res.ok || !res.body) {
    const err = await res.text();
    throw new Error(`AI stream error (${res.status}): ${err}`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of dec.decode(value).split("\n")) {
      if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
      try {
        const json = JSON.parse(line.slice(6));
        const chunk =
          json?.choices?.[0]?.delta?.content ??
          json?.delta?.text ?? "";
        if (chunk) onChunk(chunk);
      } catch { /* skip malformed lines */ }
    }
  }
}
