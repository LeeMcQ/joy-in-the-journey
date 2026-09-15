/* ================================================================== */
/*  AI Provider System                                                 */
/*  Browser calls a secure Cloudflare Worker proxy (no API key in the  */
/*  client). Modes map to worker routes:                               */
/*  mode "normal"      → POST /normal  → deepseek-chat                 */
/*  mode "deep"        → POST /deep    → deepseek-reasoner (non-stream)*/
/*                       / deepseek-chat (stream)                      */
/*  mode "explanatory" → POST /explanatory → deepseek-chat (long-form) */
/*  Proxy URL: VITE_AI_PROXY_URL or default workers.dev endpoint.      */
/* ================================================================== */

const PROXY_URL = (
  (import.meta.env.VITE_AI_PROXY_URL as string | undefined)?.trim() ||
  "https://sda-bible-ai.mcquir4l.workers.dev"
).replace(/\/$/, "");

export type AIMode = "normal" | "deep" | "explanatory";

/* ── AI readiness (proxy — no browser API key) ─────────────────────── */

/** True when the AI proxy URL is configured (always is via default). */
export function isAIReady(): boolean {
  return !!PROXY_URL;
}

/** @deprecated Prefer isAIReady — DeepSeek key never lives in the browser. */
export function hasDeepSeekKey(): boolean {
  return isAIReady();
}

/** @deprecated No-op — keys are not stored in the browser. */
export function getDeepSeekKey(): string | null {
  return null;
}

/** @deprecated No-op — keys are not stored in the browser. */
export function storeDeepSeekKey(_key: string): void {
  try {
    localStorage.removeItem("joy-deepseek-api-key");
  } catch { /* ignore */ }
}

/** Clears any legacy key left in localStorage from older builds. */
export function clearDeepSeekKey(): void {
  try {
    localStorage.removeItem("joy-deepseek-api-key");
  } catch { /* ignore */ }
}

function proxyPath(mode: AIMode): string {
  if (mode === "deep") return "/deep";
  if (mode === "explanatory") return "/explanatory";
  return "/normal";
}

/* ── Mode preference ───────────────────────────────────────────────── */

const MODE_KEY = "joy-ai-mode";

export function getStoredMode(): AIMode {
  const raw = localStorage.getItem(MODE_KEY);
  if (raw === "normal" || raw === "deep" || raw === "explanatory") return raw;
  return "normal";
}

export function storeMode(mode: AIMode): void {
  localStorage.setItem(MODE_KEY, mode);
}

export const AI_MODES: AIMode[] = ["normal", "deep", "explanatory"];

export function modeLabel(m: AIMode): string {
  if (m === "deep") return "Deep";
  if (m === "explanatory") return "Explanatory";
  return "Normal";
}

/* ── Message type ──────────────────────────────────────────────────── */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/* ── Unified prompt system ────────────────────────────────────────── */

export const SYSTEM_PROMPT = `You are the Bible Study Companion — a warm, Christ-centred guide for the "Joy in the Journey" Seventh-day Adventist Bible study series, serving learners across Southern Africa and beyond.

VOICE — Pastoral, encouraging, clear. Write like a trusted Sabbath School teacher who loves both Scripture and the person in front of them. Plain modern English by default; you may use Afrikaans or isiXhosa words or verses when the learner does or when it helps understanding.

FOUNDATION
- Scripture is the final authority. Reason from the Bible first, in its immediate and canonical context, keeping Jesus Christ and His salvation central.
- Teach in harmony with the 28 Fundamental Beliefs of the Seventh-day Adventist Church, including: salvation by grace through faith in Christ; the Bible as God's Word; the seventh-day Sabbath; the sanctuary and Christ's high-priestly ministry; the Great Controversy; the state of the dead as an unconscious sleep until the resurrection (no eternally burning hell); the literal, visible Second Coming; the Three Angels' Messages; and the Spirit of Prophecy in the ministry of Ellen G. White.
- When you cite Ellen White, name the source, use her writings to illuminate Scripture (never above it), and only where genuinely relevant.

HOW YOU REASON
- Distinguish what the text SAYS, what it TEACHES, and what should NOT be inferred beyond it.
- Present major viewpoints fairly, then land on the understanding that best harmonizes with the whole of Scripture, emphasizing God's love, justice, and redemption.
- Use cross-references, historical background, and Hebrew/Greek insight only where they genuinely illuminate the passage.
- Be honest about uncertainty. Never invent verses, quotations, or EGW citations. If unsure, say so.

CARE & BOUNDARIES
- You support but never replace the learner's pastor, church, and personal prayer; encourage them toward their local community.
- Be gracious about other Christians and denominations — correct ideas with Scripture, never condemn people. Avoid date-setting and sensational speculation.
- If someone expresses distress, self-harm, or crisis, respond with compassion, point to God's love, and gently encourage them to reach out to a pastor, a trusted person, or professional/emergency help. Give no medical, legal, or financial directives.
- Keep everything appropriate for all ages.

FORMAT — Short paragraphs and light Markdown (bold key terms, lists where helpful). Cite verses as "Book 1:1".`;

export const EXPLANATORY_SYSTEM_PROMPT = `System Role: Act as an expert biblical scholar, ancient historian, and master storyteller. Your task is to write a YouTube video script that explains difficult, overlooked, or seemingly contradictory biblical passages.

Tone & Voice: The tone must be calm, profoundly intellectual yet highly accessible, empathetic, and pastoral. Avoid all common Christian clichés, religious jargon, or overly emotional preaching. Speak with the quiet authority of a historian who has discovered a life-changing secret in the text. Ground all theology in physical, tactile realities (bread, ashes, wood, dirt, water).

Script Structure:
1. The Cinematic Hook: Start in media res with a highly sensory, cinematic description of the geographical or historical setting (e.g., the smell of woodsmoke in ancient Jerusalem). Introduce the specific tension, difficult verse, or "impossible command" without immediately giving away the answer. Never use generic YouTube intros like "Welcome back to the channel."
2. The Linguistic & Cultural Deep Dive: Identify 1 to 3 specific Hebrew or Greek words at the core of the passage. Explain their historical usage and cultural context to the original ancient Near Eastern or first-century Jewish audience. Crucial rule: Favour actual textual usage over speculative etymology (dead roots). Reframe the tension using this new understanding.
3. The Mid-Roll Integration: Insert a very brief, natural transition around the halfway mark. Use this exact phrasing style: "Quick word before we continue. If this kind of study is useful to you, subscribing genuinely helps... becoming a channel member directly supports the research."
4. The Old/New Testament Bridge: Connect the concept to the broader biblical narrative. If the text is Old Testament, show how the New Testament resolves it. If it's New Testament, root it deeply in Old Testament history and geography.
5. The Pastoral Application: Pivot directly to the modern viewer's life. Address an unspoken burden, exhaustion, or pain (e.g., feeling like a failure in prayer, sitting by a sick child's bed). Use the theological insight to offer genuine relief and grace, not a new set of rules.
6. The Cinematic Conclusion: Circle back to the opening imagery. Deliver a final, profound, paradigm-shifting thought that leaves the listener in awe of the text. End with a brief, gentle sign-off.`;

export const MODE_DIRECTIVE: Record<AIMode, string> = {
  normal:
    'DEPTH: Concise. A focused, encouraging answer the learner can absorb in under a minute (~120–180 words). End with one bold **Key Takeaway** sentence.',
  deep:
    'DEPTH: Thorough. Use the following headings, skipping any that do not genuinely apply: **Plain Meaning**, **Deeper Meaning** (says / teaches / don\'t-infer), **Original Language** (only if a word matters), **Biblical Context**, **Spirit of Prophecy** (only if relevant, with source), **Cross-References**, **Adventist Understanding**, **Application**, **Key Takeaway** (one sentence), **Go Deeper** (three progressively deeper questions).',
  explanatory:
    'DEPTH: Long-form YouTube scripture script. Follow EXPLANATORY_SYSTEM_PROMPT structure end-to-end; write a complete cinematic script.',
};

export const LANGUAGE_DIRECTIVE: Record<string, string> = {
  afr: "LANGUAGE: Respond ENTIRELY in Afrikaans — every sentence, every heading, every label, and the Key Takeaway. Write natural, modern Afrikaans. Bible book names and verse quotations may stay in their Afrikaans form. Do not reply in English unless the learner explicitly asks you to.",
  xho: "LANGUAGE: Respond ENTIRELY in isiXhosa — every sentence, every heading, every label, and the Key Takeaway. Write natural, modern isiXhosa. Do not reply in English unless the learner explicitly asks you to.",
};

/** Map a Bible translation id (any case) to a language directive, if any. */
export function languageDirectiveFor(translation?: string): string {
  if (!translation) return "";
  return LANGUAGE_DIRECTIVE[translation.toLowerCase()] ?? "";
}

export type AITask = "chat" | "scripture" | "question";

export interface AIContext {
  route?: string;
  studyId?: number;
  studyTitle?: string;
}

export interface BuildMessagesArgs {
  task: AITask;
  mode: AIMode;
  context?: AIContext;
  history?: ChatMessage[];
  /** Active Bible translation id (e.g. "afr", "xho") — steers the reply language. */
  translation?: string;
  /** Raw user input for free-form chat. */
  userText?: string;
  /** Template variables for scripture / question tasks. */
  vars?: {
    reference?: string;
    verseText?: string;
    studyTitle?: string;
    studyIntro?: string;
    questionText?: string;
    scriptureRef?: string;
    studyNote?: string;
    userAnswer?: string;
  };
}

/** Assemble [system, ...history, user] for any AI surface. */
export function buildMessages(args: BuildMessagesArgs): ChatMessage[] {
  const { task, mode, context, history = [], userText = "", vars = {}, translation } = args;

  const contextLine =
    context?.studyTitle && task === "chat"
      ? `\n\nThe learner is currently reading "${context.studyTitle}".`
      : "";

  const langLine = languageDirectiveFor(translation);

  let systemContent: string;
  if (mode === "explanatory") {
    // Explanatory uses its own YouTube-script framework — do not prepend SDA SYSTEM_PROMPT.
    systemContent = EXPLANATORY_SYSTEM_PROMPT + (langLine ? `\n\n${langLine}` : "");
  } else {
    systemContent = `${SYSTEM_PROMPT}\n\n${MODE_DIRECTIVE[mode]}${contextLine}${langLine ? `\n\n${langLine}` : ""}`;
  }

  const system: ChatMessage = {
    role: "system",
    content: systemContent,
  };

  let userContent = userText;

  if (mode === "explanatory") {
    let topic = userText;
    if (task === "scripture") {
      const ref = vars.reference ?? "";
      const verse = vars.verseText ?? "";
      topic = verse ? `${ref}: "${verse}"` : ref || userText;
    } else if (task === "question") {
      const parts = [vars.scriptureRef, vars.questionText].filter(Boolean);
      topic = parts.length ? parts.join(" — ") : userText;
    }
    userContent = `Write a script using this framework for the following biblical topic: "${topic}"`;
  } else if (task === "scripture") {
    userContent = `I'm studying ${vars.reference ?? ""}: "${vars.verseText ?? ""}". Help me understand this passage.`;
  } else if (task === "question") {
    const lines = [
      "I'm working through a study question and have written my own answer. First affirm what is sound in my thinking, then gently deepen it and, if needed, lovingly correct it from Scripture — guide me to discover more rather than just giving the answer.",
      "",
    ];
    if (vars.studyTitle) lines.push(`Study: ${vars.studyTitle}`);
    if (vars.questionText) lines.push(`Question: ${vars.questionText}`);
    if (vars.scriptureRef) lines.push(`Scripture: ${vars.scriptureRef}`);
    if (vars.studyNote) lines.push(`Study note: ${vars.studyNote.slice(0, 400)}`);
    lines.push(`My answer: "${vars.userAnswer || "(No thoughts written yet)"}"`);
    userContent = lines.join("\n");
  }

  return [system, ...history, { role: "user", content: userContent }];
}

/* ── Errors ────────────────────────────────────────────────────────── */

function friendlyAIError(status: number, body: string): string {
  const lower = body.toLowerCase();
  if (status === 0)
    return "Couldn't reach the study assistant. Check your connection and try again.";
  if (status === 401 || status === 403)
    return "The AI proxy rejected the request. Please try again later.";
  if (status === 429 || lower.includes("quota") || lower.includes("rate limit"))
    return "AI rate limit reached. Please wait a minute and try again.";
  if (status === 402 || lower.includes("insufficient") || lower.includes("balance"))
    return "AI service balance is low. Please try again later.";
  if (status === 404)
    return "AI proxy endpoint not found. Please try again later.";
  if (status === 503 || lower.includes("not configured"))
    return "AI proxy is not configured yet. Please try again later.";
  if (status >= 500)
    return "The study assistant is temporarily unavailable. Please try again in a moment.";
  return "Couldn't reach the study assistant. Please check your connection and try again.";
}

function requireProxy(): string {
  if (!PROXY_URL) {
    throw new Error("AI proxy URL is not configured.");
  }
  // Drop any legacy browser key so it cannot leak on older tabs.
  clearDeepSeekKey();
  return PROXY_URL;
}

/* ── Non-streaming chat ────────────────────────────────────────────── */

export async function chatWithAI(
  mode: AIMode,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const base = requireProxy();
  const max_tokens = mode === "explanatory" ? 8192 : 1200;

  const res = await fetch(`${base}${proxyPath(mode)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, max_tokens, stream: false }),
    signal,
  });

  if (!res.ok) {
    throw new Error(friendlyAIError(res.status, await res.text().catch(() => "")));
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
  const base = requireProxy();
  const max_tokens = mode === "explanatory" ? 8192 : 4096;

  const res = await fetch(`${base}${proxyPath(mode)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, max_tokens, stream: true }),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(friendlyAIError(res.status, await res.text().catch(() => "")));
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
