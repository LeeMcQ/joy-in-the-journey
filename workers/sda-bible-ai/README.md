# sda-bible-ai — DeepSeek proxy Worker

Cloudflare Worker that keeps `DEEPSEEK_API_KEY` server-side and exposes:

| Route | Model |
|-------|--------|
| `POST /normal` | `deepseek-chat` |
| `POST /deep` | `deepseek-reasoner` (non-stream) or `deepseek-chat` (stream) |
| `POST /explanatory` | `deepseek-chat` (high `max_tokens`) |

Body: `{ "messages": [...], "max_tokens"?: number, "stream"?: boolean }`

CORS allows `https://leemcq.github.io` and localhost.

## Deploy

```bash
cd workers/sda-bible-ai
npm install
npx wrangler login          # once
npx wrangler secret put DEEPSEEK_API_KEY
npx wrangler deploy
```

Default public URL (existing): `https://sda-bible-ai.mcquir4l.workers.dev`

Set GitHub Actions secret `VITE_AI_PROXY_URL` to that URL (already used by deploy.yml).

**Never** commit the API key or put it in `VITE_*` client env vars.
