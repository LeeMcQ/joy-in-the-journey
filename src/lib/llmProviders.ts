/* ================================================================== */
/*  LLM provider registry — bring your own key (BYOK)                  */
/*                                                                    */
/*  Modelled on the End Times Faith provider picker. The learner picks */
/*  a provider, pastes their OWN key, and it is saved only in this     */
/*  device's localStorage. The browser then calls the provider API     */
/*  directly. No key ever lives in this repo or on our server.         */
/*                                                                    */
/*  "server" = the Joy in the Journey Cloudflare Worker proxy (no key). */
/* ================================================================== */

export type ProviderId =
  | "gemini"
  | "anthropic"
  | "openai"
  | "groq"
  | "grok"
  | "deepseek"
  | "openrouter";

export type ActiveProviderId = "server" | ProviderId;

/** Hint text segments — rendered safely by the settings UI (no raw HTML). */
export type HintPart = string | { strong: string } | { href: string; text: string };

export interface ProviderSpec {
  id: ProviderId;
  name: string;
  label: string;
  model: string;
  modelLabel: string;
  tier: "free" | "paid";
  prefix: string;
  recommended?: boolean;
  /** OpenAI-compatible token field override (e.g. max_completion_tokens). */
  tokenField?: string;
  /** Extra JSON body fields merged into OpenAI-compatible requests. */
  extraBody?: Record<string, unknown>;
  /** Where to get a key. */
  keyUrl: string;
  hint: HintPart[];
}

export const PROVIDERS: Record<ProviderId, ProviderSpec> = {
  gemini: {
    id: "gemini",
    name: "Gemini",
    label: "Gemini",
    model: "gemini-3.8-flash",
    modelLabel: "gemini-3.8-flash",
    tier: "free",
    prefix: "AIza / AQ.",
    recommended: true,
    keyUrl: "https://aistudio.google.com/apikey",
    hint: [
      "Get a free key at ",
      { href: "https://aistudio.google.com/apikey", text: "aistudio.google.com/apikey" },
      " — no credit card needed. New keys start with ",
      { strong: "AQ." },
      " Older keys start with ",
      { strong: "AIza" },
      ". Both work.",
    ],
  },
  anthropic: {
    id: "anthropic",
    name: "Claude",
    label: "Claude (Anthropic)",
    model: "claude-sonnet-5",
    modelLabel: "claude-sonnet-5",
    tier: "paid",
    prefix: "sk-ant-",
    keyUrl: "https://console.anthropic.com",
    hint: [
      "Get a key at ",
      { href: "https://console.anthropic.com", text: "console.anthropic.com" },
      " — requires a small credit deposit.",
    ],
  },
  openai: {
    id: "openai",
    name: "ChatGPT",
    label: "ChatGPT (OpenAI)",
    model: "gpt-5-mini",
    modelLabel: "gpt-5-mini",
    tier: "paid",
    prefix: "sk-",
    tokenField: "max_completion_tokens",
    keyUrl: "https://platform.openai.com/api-keys",
    hint: [
      "Get a key at ",
      { href: "https://platform.openai.com/api-keys", text: "platform.openai.com" },
      " — pay-as-you-go pricing.",
    ],
  },
  groq: {
    id: "groq",
    name: "Groq",
    label: "Groq · GPT-OSS 120B",
    model: "openai/gpt-oss-120b",
    modelLabel: "gpt-oss-120b",
    tier: "free",
    prefix: "gsk_",
    extraBody: { reasoning_effort: "low" },
    keyUrl: "https://console.groq.com",
    hint: [
      "Get a ",
      { strong: "free" },
      " key at ",
      { href: "https://console.groq.com", text: "console.groq.com" },
      " — no credit card needed. Not the same as Grok. Llama 3.3 was retired; this uses GPT-OSS 120B.",
    ],
  },
  grok: {
    id: "grok",
    name: "Grok",
    label: "Grok (xAI)",
    model: "grok-4.7",
    modelLabel: "grok-4.7",
    tier: "paid",
    prefix: "xai-",
    keyUrl: "https://console.x.ai",
    hint: [
      "Get a key at ",
      { href: "https://console.x.ai", text: "console.x.ai" },
      ". Keys start with ",
      { strong: "xai-" },
      ". This is xAI Grok, not Groq. Browser calls sometimes fail — if you see a CORS error, run Grok via OpenRouter instead.",
    ],
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    label: "DeepSeek",
    model: "deepseek-flash",
    modelLabel: "deepseek-flash",
    tier: "paid",
    prefix: "sk-",
    extraBody: { thinking: { type: "disabled" } },
    keyUrl: "https://platform.deepseek.com/api_keys",
    hint: [
      "Get a key at ",
      { href: "https://platform.deepseek.com/api_keys", text: "platform.deepseek.com/api_keys" },
      ". Keys start with ",
      { strong: "sk-" },
      ". deepseek-chat was retired; this uses deepseek-flash.",
    ],
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    label: "OpenRouter · GPT-OSS 120B",
    model: "openai/gpt-oss-120b",
    modelLabel: "gpt-oss-120b",
    tier: "paid",
    prefix: "sk-or-",
    keyUrl: "https://openrouter.ai/keys",
    hint: [
      "Get a key at ",
      { href: "https://openrouter.ai/keys", text: "openrouter.ai/keys" },
      ". This route uses GPT-OSS 120B.",
    ],
  },
};

/** Display order in the picker (Gemini first — free and recommended). */
export const PROVIDER_ORDER: ProviderId[] = [
  "gemini",
  "groq",
  "grok",
  "deepseek",
  "anthropic",
  "openai",
  "openrouter",
];

/** The Joy in the Journey proxy, shown as its own card. */
export const SERVER_OPTION = {
  id: "server" as const,
  name: "Joy in the Journey server",
  modelLabel: "Shared server",
};

export function isProviderId(v: unknown): v is ProviderId {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(PROVIDERS, v);
}

/* ── Key validation (mirrors endtimesfaith looksLikeKey) ─────────── */

export function looksLikeKey(id: ProviderId, rawKey: string): boolean {
  const key = rawKey.trim();
  if (!key) return false;
  if (id === "gemini") return key.startsWith("AIza") || key.startsWith("AQ.");
  if (id === "grok") return key.startsWith("xai-");
  if (id === "openai" || id === "deepseek")
    return key.startsWith("sk-") && !key.startsWith("sk-ant-") && !key.startsWith("sk-or-");
  return key.startsWith(PROVIDERS[id].prefix);
}

export function keyPlaceholder(id: ProviderId): string {
  if (id === "gemini") return "AIza… or AQ.…";
  return `${PROVIDERS[id].prefix}…`;
}

/* ── Device-only storage ──────────────────────────────────────────── */

const KEY_PREFIX = "joy_ai_key_";
const ACTIVE_KEY = "joy_ai_provider";
/** Fired on window whenever the active provider or a saved key changes. */
export const PROVIDER_CHANGE_EVENT = "joy-ai-provider-change";

function notifyChange(): void {
  try {
    window.dispatchEvent(new Event(PROVIDER_CHANGE_EVENT));
  } catch { /* non-browser */ }
}

export function getStoredKey(id: ProviderId): string {
  try {
    return localStorage.getItem(KEY_PREFIX + id) || "";
  } catch {
    return "";
  }
}

export function setStoredKey(id: ProviderId, key: string): void {
  try {
    localStorage.setItem(KEY_PREFIX + id, key.trim());
  } catch { /* storage unavailable */ }
  notifyChange();
}

export function clearStoredKey(id: ProviderId): void {
  try {
    localStorage.removeItem(KEY_PREFIX + id);
  } catch { /* ignore */ }
  notifyChange();
}

export function hasValidStoredKey(id: ProviderId): boolean {
  return looksLikeKey(id, getStoredKey(id));
}

export function getActiveProvider(): ActiveProviderId {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (raw === "server" || isProviderId(raw)) return raw;
  } catch { /* ignore */ }
  return "server";
}

export function setActiveProvider(id: ActiveProviderId): void {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch { /* ignore */ }
  notifyChange();
}

/** First provider (in picker order) with a valid saved key, if any. */
export function firstProviderWithKey(exclude?: ProviderId): ProviderId | null {
  for (const id of PROVIDER_ORDER) {
    if (id !== exclude && hasValidStoredKey(id)) return id;
  }
  return null;
}

/** "Gemini · gemini-3.8-flash" or "Joy in the Journey server". */
export function activeProviderLabel(id: ActiveProviderId = getActiveProvider()): string {
  if (id === "server") return SERVER_OPTION.name;
  const p = PROVIDERS[id];
  return `${p.name} · ${p.modelLabel}`;
}

/* ── Calling providers ────────────────────────────────────────────── */

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CompleteOptions {
  system?: string;
  maxTokens?: number;
  signal?: AbortSignal;
}

class ProviderError extends Error {
  quota?: boolean;
  status?: number;
  constructor(message: string, extra?: { quota?: boolean; status?: number }) {
    super(message);
    this.name = "ProviderError";
    if (extra) Object.assign(this, extra);
  }
}

function isAbort(e: unknown, signal?: AbortSignal): boolean {
  return !!signal?.aborted || (e instanceof Error && e.name === "AbortError");
}

function abortError(): Error {
  const e = new Error("Request cancelled.");
  e.name = "AbortError";
  return e;
}

function corsMessage(id: ProviderId): string {
  const name = PROVIDERS[id].name;
  if (id === "grok")
    return `${name} blocked the browser request (CORS). Run Grok via OpenRouter instead, or try Gemini or Groq.`;
  return `${name} blocked the browser request (CORS) or the network is down. Check your connection, or try Gemini or Groq.`;
}

function invalidKeyMessage(id: ProviderId): string {
  return `${PROVIDERS[id].name} rejected this API key. Create a new key at ${PROVIDERS[id].keyUrl.replace(/^https:\/\//, "")} and save it in More → AI provider.`;
}

function quotaMessage(id: ProviderId): string {
  if (id === "gemini")
    return "Gemini free-tier quota is exhausted for the moment. Wait about a minute, then try again.";
  if (id === "groq")
    return "Groq free-tier rate limit reached. Wait a minute, then try again.";
  return `${PROVIDERS[id].name} says this key is out of quota or credit. Check your balance with ${PROVIDERS[id].name}, or switch provider in More → AI provider.`;
}

/** Map an HTTP error from any provider to a friendly message. */
function friendlyProviderError(id: ProviderId, status: number, msg: string): ProviderError {
  const text = String(msg || "");
  if (
    status === 401 ||
    (status === 403 && /key|auth|permission|credential/i.test(text)) ||
    /API_KEY_INVALID|API key not valid|invalid.{0,12}(api[_ ]?)?key|incorrect api key|UNAUTHENTICATED|invalid authentication|authentication_error/i.test(text)
  ) {
    return new ProviderError(invalidKeyMessage(id), { status });
  }
  if (
    status === 429 ||
    status === 402 ||
    /RESOURCE_EXHAUSTED|quota|insufficient|balance|credit|rate.?limit/i.test(text)
  ) {
    return new ProviderError(quotaMessage(id), { quota: true, status });
  }
  return new ProviderError(text || `${PROVIDERS[id].name} error ${status}`, { status });
}

/**
 * Normalise chat history for strict providers: drop empty turns, start with a
 * user turn, and merge consecutive turns from the same role.
 */
export function normaliseMessages(messages: LLMMessage[]): LLMMessage[] {
  const out: LLMMessage[] = [];
  for (const m of messages) {
    const content = (m.content ?? "").trim();
    if (!content) continue;
    if (!out.length && m.role !== "user") continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${content}`;
    else out.push({ role: m.role, content });
  }
  return out;
}

/* Gemini — with model fallback + retired-model detection + quota handling */

const GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash"];

export async function callGemini(
  key: string,
  messages: LLMMessage[],
  opts: CompleteOptions = {},
): Promise<string> {
  const contents = normaliseMessages(messages).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  async function once(model: string, withThinking: boolean): Promise<string> {
    const generationConfig: Record<string, unknown> = {
      maxOutputTokens: opts.maxTokens || 8192,
      temperature: 0.7,
    };
    if (withThinking) generationConfig.thinkingConfig = { thinkingLevel: "low" };
    const body: Record<string, unknown> = { contents, generationConfig };
    if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };

    let res: Response;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify(body),
          signal: opts.signal,
        },
      );
    } catch (e) {
      if (isAbort(e, opts.signal)) throw abortError();
      throw new ProviderError(corsMessage("gemini"));
    }
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg: string = data?.error?.message || "";
      const status: string = data?.error?.status || "";
      if (res.status === 429 || status === "RESOURCE_EXHAUSTED" || /quota/i.test(msg)) {
        throw new ProviderError("QUOTA", { quota: true, status: res.status });
      }
      if (/API_KEY_INVALID|API key not valid|UNAUTHENTICATED|invalid authentication/i.test(`${msg} ${status}`)) {
        throw new ProviderError("Gemini rejected this API key. Create a new key at aistudio.google.com/apikey.");
      }
      throw new ProviderError(msg || `Gemini error ${res.status}`, { status: res.status });
    }
    const parts: any[] = (data.candidates || []).flatMap((c: any) => c?.content?.parts || []);
    const text = parts
      .filter((p) => p && !p.thought)
      .map((p) => p.text || "")
      .join("")
      .trim();
    if (!text) throw new ProviderError("Empty response from Gemini. Try again.");
    return text;
  }

  const retired = (msg: unknown) =>
    /no longer available|not found|is not supported|unknown model|invalid model/i.test(String(msg || ""));

  let last: ProviderError | Error | null = null;
  for (const model of GEMINI_MODELS) {
    try {
      return await once(model, true);
    } catch (e) {
      if (isAbort(e, opts.signal)) throw abortError();
      last = e as Error;
      if ((e as ProviderError).quota) break;
      if (/thinking|Empty response/i.test(String((e as Error).message || ""))) {
        try {
          return await once(model, false);
        } catch (e2) {
          if (isAbort(e2, opts.signal)) throw abortError();
          last = e2 as Error;
          if ((e2 as ProviderError).quota || !retired((e2 as Error).message)) {
            if (!retired((e as Error).message)) break;
          }
        }
        continue;
      }
      if (!retired((e as Error).message)) break;
    }
  }
  if (last && (last as ProviderError).quota) throw new ProviderError(quotaMessage("gemini"), { quota: true });
  throw last || new ProviderError("Gemini request failed.");
}

/* Anthropic — direct browser access header */

export async function callAnthropic(
  key: string,
  messages: LLMMessage[],
  opts: CompleteOptions = {},
): Promise<string> {
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: PROVIDERS.anthropic.model,
        max_tokens: opts.maxTokens || 4096,
        ...(opts.system ? { system: opts.system } : {}),
        messages: normaliseMessages(messages),
      }),
      signal: opts.signal,
    });
  } catch (e) {
    if (isAbort(e, opts.signal)) throw abortError();
    throw new ProviderError(corsMessage("anthropic"));
  }
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw friendlyProviderError("anthropic", res.status, data?.error?.message || data?.error?.type || "");
  }
  const text = (data.content || []).map((b: any) => b?.text || "").join("").trim();
  if (!text) throw new ProviderError("Empty response from Claude. Try again.");
  return text;
}

/* OpenAI-compatible (OpenAI, Groq, xAI Grok, DeepSeek, OpenRouter) */

function messageText(msg: any): string {
  if (!msg) return "";
  if (typeof msg.content === "string" && msg.content.trim()) return msg.content;
  if (Array.isArray(msg.content)) {
    const t = msg.content.map((p: any) => (p && (p.text || "")) || "").join("");
    if (t.trim()) return t;
  }
  return msg.reasoning_content || "";
}

export function providerEndpoint(
  id: Exclude<ProviderId, "gemini" | "anthropic">,
): [url: string, model: string, extraHeaders: Record<string, string> | null] {
  if (id === "openai") return ["https://api.openai.com/v1/chat/completions", PROVIDERS.openai.model, null];
  if (id === "groq") return ["https://api.groq.com/openai/v1/chat/completions", PROVIDERS.groq.model, null];
  if (id === "grok") return ["https://api.x.ai/v1/chat/completions", PROVIDERS.grok.model, null];
  if (id === "deepseek") return ["https://api.deepseek.com/chat/completions", PROVIDERS.deepseek.model, null];
  return [
    "https://openrouter.ai/api/v1/chat/completions",
    PROVIDERS.openrouter.model,
    { "HTTP-Referer": "https://leemcq.github.io/joy-in-the-journey/", "X-Title": "Joy in the Journey" },
  ];
}

export async function callOpenAICompat(
  id: Exclude<ProviderId, "gemini" | "anthropic">,
  key: string,
  messages: LLMMessage[],
  opts: CompleteOptions = {},
): Promise<string> {
  const [url, model, extraHeaders] = providerEndpoint(id);
  const spec = PROVIDERS[id];
  const chat: Array<{ role: string; content: string }> = [];
  if (opts.system) chat.push({ role: "system", content: opts.system });
  chat.push(...normaliseMessages(messages));
  const payload: Record<string, unknown> = { model, messages: chat };
  payload[spec.tokenField || "max_tokens"] = opts.maxTokens || 4096;
  if (spec.extraBody) Object.assign(payload, spec.extraBody);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...(extraHeaders || {}) },
      body: JSON.stringify(payload),
      signal: opts.signal,
    });
  } catch (e) {
    if (isAbort(e, opts.signal)) throw abortError();
    throw new ProviderError(corsMessage(id));
  }
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || (typeof data?.error === "string" ? data.error : "") || data?.message || "";
    throw friendlyProviderError(id, res.status, msg);
  }
  const text = messageText(data?.choices?.[0]?.message).trim();
  if (!text) throw new ProviderError(`Empty response from ${spec.name}. Try again.`);
  return text;
}

/** Call a provider with a saved (or supplied) key and return plain text. */
export async function completeWithProvider(
  id: ProviderId,
  messages: LLMMessage[],
  opts: CompleteOptions & { key?: string } = {},
): Promise<string> {
  const key = (opts.key ?? getStoredKey(id)).trim();
  if (!key) throw new ProviderError(missingKeyMessage(id));
  if (!looksLikeKey(id, key)) {
    throw new ProviderError(
      `The saved key doesn't look like a ${PROVIDERS[id].name} key (expected ${keyPlaceholder(id)}). Update it in More → AI provider.`,
    );
  }
  if (id === "gemini") return callGemini(key, messages, opts);
  if (id === "anthropic") return callAnthropic(key, messages, opts);
  return callOpenAICompat(id, key, messages, opts);
}

export function missingKeyMessage(id: ProviderId): string {
  return `No ${PROVIDERS[id].name} API key saved on this device yet. Open More → AI provider, paste your key and tap Save — or pick another provider.`;
}

/** Tiny round-trip used by the settings "Test" button. */
export async function testProvider(
  id: ProviderId,
  key?: string,
  signal?: AbortSignal,
): Promise<{ text: string; ms: number }> {
  const t0 = performance.now();
  // Generous token budget: reasoning models (gpt-5-mini, gpt-oss) spend
  // tokens thinking before they answer, so a tiny cap returns nothing.
  const text = await completeWithProvider(id, [{ role: "user", content: "Reply with just the word: Amen" }], {
    key,
    system: "You are a connection test. Reply with one word only.",
    maxTokens: 1024,
    signal,
  });
  return { text: text.slice(0, 80), ms: Math.round(performance.now() - t0) };
}
