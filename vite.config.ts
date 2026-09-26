import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";
import path from "path";
import studiesData from "./src/data/studies.json";

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

export default defineConfig({
  base: GITHUB_REPO_BASE,

  plugins: [
    react(),
    spaRouteFallbacks(SPA_ROUTES),
    VitePWA({
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
    rollupOptions: {
      output: {
        manualChunks: {
          "study-data": ["./src/data/studies.json"],
        },
      },
    },
  },
});