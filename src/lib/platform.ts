/* ================================================================== */
/*  Platform helpers for the Android app build.                        */
/*                                                                    */
/*  `npm run build:android` (vite build --mode android) bundles dist   */
/*  into a Capacitor app served from https://localhost/. There, a      */
/*  relative URL such as bibles/afr.json points inside the APK, not at */
/*  the website, and there is no service worker to cache downloads.    */
/*  The web (GitHub Pages) build never takes these branches:           */
/*  __ANDROID_APP__ is a build-time literal, so they are dropped.      */
/* ================================================================== */

import { ANDROID_BUNDLED_BIBLES, WEB_SITE_BASE } from "@/lib/androidBundle";

/** True only in the Android app build (see __ANDROID_APP__ in vite-env.d.ts). */
const IS_ANDROID_APP = __ANDROID_APP__;

/** Cache Storage bucket that keeps downloaded Bible JSON on the device (Android only). */
const ANDROID_BIBLE_CACHE = "joy-android-bible-json";

/**
 * URL for a Bible data file under public/ (e.g. "bibles/afr.json").
 * Web: same-origin, under the Vite base. Android: bundled files are served
 * from the APK; anything else comes from the live site.
 */
export function bibleDataUrl(relPath: string): string {
  const rel = relPath.replace(/^\/+/, "");
  if (IS_ANDROID_APP && !ANDROID_BUNDLED_BIBLES.includes(rel)) return `${WEB_SITE_BASE}${rel}`;
  const base = import.meta.env.BASE_URL ?? "/";
  return `${base.endsWith("/") ? base : `${base}/`}${rel}`;
}

/** True when this translation's JSON ships inside the Android app (saves offline too). */
export function isBundledBible(translationId: string): boolean {
  return IS_ANDROID_APP && ANDROID_BUNDLED_BIBLES.includes(`bibles/${translationId}.json`);
}

/**
 * fetch() for Bible data files. On the web this is a plain fetch (the
 * service worker caches it). In the Android app, a downloaded (non-bundled)
 * file is kept in Cache Storage, cache-first, the same as the web service
 * worker's "bible-full-data" rule, so it still loads offline after restarts.
 * Pass persist=false for files that are imported into IndexedDB anyway (XHO75).
 */
export async function fetchBibleData(
  relPath: string,
  signal?: AbortSignal,
  persist = true,
): Promise<Response> {
  const url = bibleDataUrl(relPath);
  const init = signal ? { signal } : undefined;
  const remote = IS_ANDROID_APP && url.startsWith(WEB_SITE_BASE);
  if (!remote || !persist || typeof caches === "undefined") return fetch(url, init);

  const cache = await caches.open(ANDROID_BIBLE_CACHE);
  const hit = await cache.match(url);
  if (hit) return hit;
  const res = await fetch(url, init);
  if (res.ok) await cache.put(url, res.clone());
  return res;
}

/** Remove a downloaded Bible JSON from the Android device cache (re-install / remove). */
export async function forgetBibleData(relPath: string): Promise<void> {
  if (!IS_ANDROID_APP || typeof caches === "undefined") return;
  try {
    const cache = await caches.open(ANDROID_BIBLE_CACHE);
    await cache.delete(bibleDataUrl(relPath));
  } catch { /* ignore */ }
}

/**
 * POST JSON to the AI worker from the Android app through Capacitor's native
 * HTTP client (CapacitorHttp). Used ONLY for the sda-bible-ai worker: its CORS
 * allow-list does not include the app origin https://localhost, and a native
 * request is not subject to CORS. Everything else still uses fetch().
 * Returns a standard Response so callers handle it like fetch.
 */
export async function nativePostJson(url: string, body: unknown): Promise<Response> {
  // Guard keeps @capacitor/core out of the web build entirely.
  if (!IS_ANDROID_APP) throw new Error("nativePostJson is only available in the Android app");
  const { CapacitorHttp } = await import("@capacitor/core");
  const r = await CapacitorHttp.post({
    url,
    headers: { "Content-Type": "application/json" },
    data: body,
    responseType: "text",
    connectTimeout: 20000,
    readTimeout: 120000,
  });
  const text = typeof r.data === "string" ? r.data : JSON.stringify(r.data);
  return new Response(text, {
    status: r.status,
    headers: { "Content-Type": "application/json" },
  });
}
