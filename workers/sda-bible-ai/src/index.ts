/**
 * Joy in the Journey — DeepSeek AI proxy (Cloudflare Worker)
 *
 * Browser POSTs to /normal | /deep | /explanatory with
 *   { messages, max_tokens?, stream? }
 * Worker adds DEEPSEEK_API_KEY and forwards to DeepSeek.
 * Never log the key.
 */

export interface Env {
  DEEPSEEK_API_KEY: string;
}

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

const ALLOWED_ORIGINS = new Set([
  "https://leemcq.github.io",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
  "http://127.0.0.1:3000",
]);

type Mode = "normal" | "deep" | "explanatory";

interface ProxyBody {
  messages: Array<{ role: string; content: string }>;
  max_tokens?: number;
  stream?: boolean;
}

function corsHeaders(origin: string | null): HeadersInit {
  const allow =
    origin && (ALLOWED_ORIGINS.has(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
      ? origin
      : "https://leemcq.github.io";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonError(status: number, message: string, origin: string | null): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

function modeFromPath(pathname: string): Mode | null {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/normal") return "normal";
  if (p === "/deep") return "deep";
  if (p === "/explanatory") return "explanatory";
  // Optional alias
  if (p === "/chat") return "normal";
  return null;
}

function modelFor(mode: Mode, stream: boolean): string {
  if (mode === "explanatory") return "deepseek-chat";
  // Prefer reasoner for deep non-streaming; stream with chat for reliable SSE deltas.
  if (mode === "deep" && !stream) return "deepseek-reasoner";
  return "deepseek-chat";
}

function defaultMaxTokens(mode: Mode, stream: boolean): number {
  if (mode === "explanatory") return 8192;
  return stream ? 4096 : 1200;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders(origin),
      });
    }

    const mode = modeFromPath(url.pathname);
    if (!mode) {
      return jsonError(
        400,
        "Unknown route. Use POST /normal, /deep, or /explanatory.",
        origin,
      );
    }

    if (!env.DEEPSEEK_API_KEY) {
      return jsonError(503, "AI proxy not configured", origin);
    }

    let body: ProxyBody;
    try {
      body = (await request.json()) as ProxyBody;
    } catch {
      return jsonError(400, "Invalid JSON body", origin);
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return jsonError(400, "messages array is required", origin);
    }

    const stream = !!body.stream;
    const model = modelFor(mode, stream);
    const max_tokens = body.max_tokens ?? defaultMaxTokens(mode, stream);

    let upstream: Response;
    try {
      upstream = await fetch(DEEPSEEK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: body.messages,
          max_tokens,
          stream,
        }),
      });
    } catch {
      return jsonError(502, "Failed to reach DeepSeek", origin);
    }

    const headers = new Headers(corsHeaders(origin));

    if (stream) {
      headers.set("Content-Type", upstream.headers.get("Content-Type") || "text/event-stream");
      headers.set("Cache-Control", "no-cache");
      if (!upstream.ok || !upstream.body) {
        const errText = await upstream.text().catch(() => "");
        return new Response(errText || `DeepSeek error (${upstream.status})`, {
          status: upstream.status,
          headers: { ...Object.fromEntries(headers), "Content-Type": "text/plain" },
        });
      }
      return new Response(upstream.body, { status: upstream.status, headers });
    }

    headers.set("Content-Type", "application/json");
    const text = await upstream.text();
    return new Response(text, { status: upstream.status, headers });
  },
};
