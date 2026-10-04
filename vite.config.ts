import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";
import path from "path";
import studiesData from "./src/data/studies.json";
import { ANDROID_BUNDLED_BIBLES } from "./src/lib/androidBundle";

// GitHub Pages base path (change only if you rename the repo)
const GITHUB_REPO_BASE = "/joy-in-the-journey/";

/**
 * GitHub Pages has no SPA rewrites: deep links such as /bible (the PWA
 * start_url) were served from 404.html with HTTP 404, which logs a console
 * error and can upset installability checks. Pages serves "/bible" from
 * "bible.html", so emit a copy of index.html for every client route.
 */
const SPA_ROUTES = [
  "bible", "home", "studies", "notes", "more",
  ...(studiesData as { studies: { id: number }[] }).studies.map((s) => `study/${s.id}`),
];

function spaRouteFallbacks(routes: string[]): Plugin {
  let outDir = "dist";
  return {
    name: "spa-route-fallbacks",
    apply: "build",
    configResolved(cfg) { outDir = path.resolve(cfg.root, cfg.build.outDir); },
    writeBundle() {
      const index = path.join(outDir, "index.html");
      if (!fs.existsSync(index)) return;
      for (const r of routes) {
        const file = path.join(outDir, `${r}.html`);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.copyFileSync(index, file);
      }
    },
  };
}

/**
 * Android app build (`npm run build:android` = `vite build --mode android`).
 * The output (dist-android/) is bundled inside the Capacitor APK and served
 * from https://localhost/, which falls back to index.html for client routes.
 * This plugin (Android mode only):
 *   - drops public/ files the app must not or need not ship: every Bible JSON
 *     except ANDROID_BUNDLED_BIBLES (XHO75 is not redistributable; AFR is
 *     downloaded from the live site, see lib/platform.ts), plus duplicate or
 *     web-only icons/files (~1.8 MB)
 *   - removes the Google Fonts links (fonts are bundled, src/android-fonts.css)
 *   - adds a blank-screen guard (android-static/boot-guard.js + a visible
 *     placeholder in #root) and the Capacitor error page android-error.html
 */
const ANDROID_PRUNE = [
  "_redirects",
  "icons/Icon-512.png",
  "icons/web-app-manifest-192x192.png",
  "icons/web-app-manifest-512x512.png",
  "icons/favicon.svg",
  "icons/site.webmanifest",
];

function androidAppBuild(): Plugin {
  let outDir = "dist-android";
  return {
    name: "android-app-build",
    apply: "build",
    configResolved(cfg) { outDir = path.resolve(cfg.root, cfg.build.outDir); },
    transformIndexHtml(html) {
      const guard = fs.readFileSync(path.resolve(__dirname, "android-static/boot-guard.js"), "utf8");
      return html
        // Fonts are bundled (src/android-fonts.css): drop the Google Fonts links.
        .replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.(googleapis|gstatic)\.com"[^>]*>/g, "")
        .replace(/\s*<link\s+href="https:\/\/fonts\.googleapis\.com\/css2[^>]*>/g, "")
        // Never a silent blank screen: visible placeholder in #root (React
        // replaces it on mount) + an early error/timeout guard.
        .replace("<head>", `<head>\n    <script>${guard}</script>`)
        .replace(
          '<div id="root"></div>',
          '<div id="root"><div id="boot-fallback" style="min-height:100vh;display:flex;flex-direction:column;' +
            'align-items:center;justify-content:center;text-align:center;padding:32px;box-sizing:border-box;' +
            'background:#0F172A;color:#F8FAFC;font-family:system-ui,sans-serif">' +
            '<img src="/icons/icon-192.png" alt="" width="96" height="96" style="border-radius:22px;margin-bottom:16px">' +
            '<div style="font-size:18px;font-weight:600">Joy in the Journey</div>' +
            '<div style="opacity:.6;margin-top:6px">Loading…</div></div></div>',
        );
    },
    writeBundle() {
      // Capacitor server.errorPath page (old WebView / main-frame load error).
      fs.copyFileSync(path.resolve(__dirname, "android-static/android-error.html"), path.join(outDir, "android-error.html"));
      for (const rel of ANDROID_PRUNE) fs.rmSync(path.join(outDir, rel), { force: true });
      const walk = (dir: string): string[] =>
        fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
          e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
      const biblesDir = path.join(outDir, "bibles");
      if (!fs.existsSync(biblesDir)) return;
      for (const file of walk(biblesDir)) {
        const rel = path.relative(outDir, file).split(path.sep).join("/");
        if (!ANDROID_BUNDLED_BIBLES.includes(rel)) fs.rmSync(file);
      }
      for (const e of fs.readdirSync(biblesDir, { withFileTypes: true })) {
        const d = path.join(biblesDir, e.name);
        if (e.isDirectory() && fs.readdirSync(d).length === 0) fs.rmdirSync(d);
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const isAndroid = mode === "android";
  return {
  // Web: served under /joy-in-the-journey/ on GitHub Pages (unchanged).
  // Android: served from the root of https://localhost/.
  base: isAndroid ? "/" : GITHUB_REPO_BASE,

  // Build-time flag for Android-only code paths (declared in vite-env.d.ts).
  define: { __ANDROID_APP__: JSON.stringify(isAndroid) },

  plugins: [
    react(),
    // Per-route HTML copies are a GitHub Pages workaround; the app's local server doesn't need them.
    !isAndroid && spaRouteFallbacks(SPA_ROUTES),
    isAndroid && androidAppBuild(),
    VitePWA({
      // No service worker or web manifest in the Android app: everything is
      // already on the device, and Bible downloads are kept in IndexedDB /
      // Cache Storage by the app itself.
      disable: isAndroid,
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "apple-touch-icon.png",
        "icons/icon-192.png",
        "icons/icon-512.png",
        // Small bible assets only — do NOT precache multi-MB *.json into the SW install.
      ],
      manifest: {
        name: "Joy in the Journey",
        short_name: "Joy Journey",
        description: "28 interactive Adventist Bible studies grounded in SDA theology",
        theme_color: "#0F172A",
        background_color: "#0F172A",
        display: "standalone",
        orientation: "any",
        scope: GITHUB_REPO_BASE,
        start_url: `${GITHUB_REPO_BASE}bible`,
        categories: ["education", "books"],
        icons: [
          { src: `${GITHUB_REPO_BASE}icons/icon-192.png`, sizes: "192x192", type: "image/png" },
          { src: `${GITHUB_REPO_BASE}icons/icon-512.png`, sizes: "512x512", type: "image/png" },
          { src: `${GITHUB_REPO_BASE}icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          {
            name: "Bible Reader",
            url: `${GITHUB_REPO_BASE}bible`,
            icons: [{ src: `${GITHUB_REPO_BASE}icons/icon-192.png`, sizes: "192x192" }],
          },
          {
            name: "Continue Studying",
            url: `${GITHUB_REPO_BASE}studies`,
            icons: [{ src: `${GITHUB_REPO_BASE}icons/icon-192.png`, sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Keep the install-time precache lean: skip the per-route HTML copies
        // (navigateFallback serves index.html) and duplicate/unused icon files
        // (~1.7 MB, incl. a 685 KB icons/favicon.svg nothing references).
        globIgnores: [
          "**/node_modules/**",
          "404.html",
          ...SPA_ROUTES.map((r) => `${r}.html`),
          "icons/Icon-512.png",
          "icons/web-app-manifest-*.png",
          "icons/favicon.svg",
        ],
        navigateFallback: `${GITHUB_REPO_BASE}index.html`,
        navigateFallbackAllowlist: [/^\/(?!api\/).*/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-style",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-woff",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/bible-api\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "bible-api-cache",
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Match bible JSON on any origin (local preview, GitHub Pages, custom domain).
            urlPattern: ({ url }) =>
              url.pathname.includes("/bibles/") && url.pathname.endsWith(".json"),
            handler: "CacheFirst",
            options: {
              cacheName: "bible-full-data",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],

  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },

  build: {
    target: "es2020",
    outDir: isAndroid ? "dist-android" : "dist",
    rollupOptions: {
      output: {
        manualChunks: {
          "study-data": ["./src/data/studies.json"],
        },
      },
    },
  },
  };
});