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
  role: "system" | "user" | "assistant";
  content: string;
}

/* ── Unified prompt system ──────────────────────────────────────────────────
 * One grounded SYSTEM_PROMPT is sent as a real `system` role on EVERY call,
 * from every AI surface (global chat, study questions, scripture popup).
 * Depth is controlled by mode (Normal = concise, Deep = structured), and the
 * task framing shapes the user message. This replaces the three divergent
 * prompt strategies that previously lived in separate components.
 * ------------------------------------------------------------------------- */

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

export const MODE_DIRECTIVE: Record<AIMode, string> = {
  normal:
    'DEPTH: Concise. A focused, encouraging answer the learner can absorb in under a minute (~120–180 words). End with one bold **Key Takeaway** sentence.',
  deep:
    'DEPTH: Thorough. Use the following headings, skipping any that do not genuinely apply: **Plain Meaning**, **Deeper Meaning** (says / teaches / don\'t-infer), **Original Language** (only if a word matters), **Biblical Context**, **Spirit of Prophecy** (only if relevant, with source), **Cross-References**, **Adventist Understanding**, **Application**, **Key Takeaway** (one sentence), **Go Deeper** (three progressively deeper questions).',
};

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
  const { task, mode, context, history = [], userText = "", vars = {} } = args;

  const contextLine =
    context?.studyTitle && task === "chat"
      ? `\n\nThe learner is currently reading "${context.studyTitle}".`
      : "";

  const system: ChatMessage = {
    role: "system",
    content: `${SYSTEM_PROMPT}\n\n${MODE_DIRECTIVE[mode]}${contextLine}`,
  };

  let userContent = userText;

  if (task === "scripture") {
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
