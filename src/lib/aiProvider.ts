/* ================================================================== */
/*  AI Provider System                                                 */
/*  Browser calls DeepSeek OpenAI-compatible chat completions.        */
/*  mode "normal"      → deepseek-chat (fast)                         */
/*  mode "deep"        → deepseek-reasoner (non-stream) / deepseek-chat*/
/*                       (stream — reasoner SSE can omit delta.content)*/
/*  mode "explanatory" → deepseek-chat (long-form YouTube script)     */
/*  API key: localStorage `joy-deepseek-api-key` or                    */
/*           VITE_DEEPSEEK_API_KEY at build time.                      */
/* ================================================================== */

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_KEY_STORAGE = "joy-deepseek-api-key";

export type AIMode = "normal" | "deep" | "explanatory";

/* ── DeepSeek API key ─────────────────────────────────────────────── */

export function getDeepSeekKey(): string | null {
  try {
    const stored = localStorage.getItem(DEEPSEEK_KEY_STORAGE)?.trim();
    if (stored) return stored;
  } catch { /* private mode / unavailable */ }
  const envKey = (import.meta.env.VITE_DEEPSEEK_API_KEY as string | undefined)?.trim();
  return envKey || null;
}

export function storeDeepSeekKey(key: string): void {
  localStorage.setItem(DEEPSEEK_KEY_STORAGE, key.trim());
}

export function clearDeepSeekKey(): void {
  localStorage.removeItem(DEEPSEEK_KEY_STORAGE);
}

export function hasDeepSeekKey(): boolean {
  return !!getDeepSeekKey();
}

/** Alias used by older call sites — now reflects a real DeepSeek key. */
export function hasAnyKey(): boolean {
  return hasDeepSeekKey();
}

function modelFor(mode: AIMode, stream: boolean): string {
  // Explanatory always uses deepseek-chat (long-form script).
  if (mode === "explanatory") return "deepseek-chat";
  // Prefer reasoner for deep non-streaming answers. For SSE streaming use
  // deepseek-chat so chunks arrive as choices[0].delta.content reliably.
  if (mode === "deep" && !stream) return "deepseek-reasoner";
  return "deepseek-chat";
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

/* ── Legacy stubs (kept so old imports don't break) ────────────────── */
export type ProviderId = "normal" | "deep" | "explanatory";
export function getStoredProvider(): AIMode { return getStoredMode(); }
export function storeProvider(id: AIMode): void { storeMode(id); }
export function getStoredKey(_: string): string | null { return getDeepSeekKey(); }
export function storeKey(_a: string, key: string): void { storeDeepSeekKey(key); }

export const PROVIDERS = [
  { id: "normal" as const, name: "Normal", emoji: "⚡", tier: "free" as const, description: "Fast everyday responses" },
  { id: "deep"   as const, name: "Deep",   emoji: "🔬", tier: "free" as const, description: "Thorough research-grade responses" },
  { id: "explanatory" as const, name: "Explanatory", emoji: "🎬", tier: "free" as const, description: "Cinematic YouTube-style scripture script" },
];

export const AI_MODES: AIMode[] = ["normal", "deep", "explanatory"];

export function modeLabel(m: AIMode): string {
  if (m === "deep") return "Deep";
  if (m === "explanatory") return "Explanatory";
  return "Normal";
}

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
    return "Couldn't reach DeepSeek. Check your connection and try again.";
  if (status === 401 || status === 403)
    return "DeepSeek rejected the API key. Open More → AI Assistant, clear the key, and paste a valid one from platform.deepseek.com/api_keys.";
  if (status === 429 || lower.includes("quota") || lower.includes("rate limit"))
    return "DeepSeek rate limit reached. Please wait a minute and try again.";
  if (status === 402 || lower.includes("insufficient") || lower.includes("balance"))
    return "DeepSeek account has insufficient balance. Top up at platform.deepseek.com.";
  if (status === 404)
    return "DeepSeek endpoint not found. Please try again later.";
  if (status >= 500)
    return "DeepSeek is temporarily unavailable. Please try again in a moment.";
  return "Couldn't reach the study assistant. Please check your connection and try again.";
}

function requireKey(): string {
  const key = getDeepSeekKey();
  if (!key) {
    throw new Error(
      "Add your DeepSeek API key in More → AI Assistant (or set VITE_DEEPSEEK_API_KEY at build time).",
    );
  }
  return key;
}

/* ── Non-streaming chat ────────────────────────────────────────────── */

export async function chatWithAI(
  mode: AIMode,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const key = requireKey();
  const model = modelFor(mode, false);

  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: mode === "explanatory" ? 8192 : 1200, stream: false }),
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
  const key = requireKey();
  // Always stream with deepseek-chat (see modelFor comment).
  const model = modelFor(mode, true);

  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: mode === "explanatory" ? 8192 : 4096, stream: true }),
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
