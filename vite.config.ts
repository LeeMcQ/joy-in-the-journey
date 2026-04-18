import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// For GitHub Pages: set VITE_BASE="/your-repo-name/" before building
// For custom domain or Vercel/Netlify: leave as "/"
const base = process.env.VITE_BASE || "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "apple-touch-icon.png",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "bibles/*.json",
      ],
      manifest: {
        name: "Joy in the Journey — Bible Study Series",
        short_name: "Joy Journey",
        description: "28 interactive Bible studies to deepen your walk with God",
        theme_color: "#0F172A",
        background_color: "#0F172A",
        display: "standalone",
        // FIX #1: Changed "portrait" → "any" so landscape is no longer OS-blocked.
        // CSS media queries in index.css now handle the landscape layout.
        orientation: "any",
        scope: base,
        start_url: base,
        categories: ["education", "books"],
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: "192x192", type: "image/png" },
          { src: `${base}icons/icon-512.png`, sizes: "512x512", type: "image/png" },
          { src: `${base}icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          {
            name: "Continue Studying",
            url: `${base}studies`,
            icons: [{ src: `${base}icons/icon-192.png`, sizes: "192x192" }],
          },
          {
            name: "Bible Reader",
            url: `${base}bible`,
            icons: [{ src: `${base}icons/icon-192.png`, sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: `${base}index.html`,
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
            // FIX #2: Added cacheableResponse — without this, GitHub Pages CDN
            // responses may be treated as opaque and silently refused by Workbox.
            urlPattern: /^https:\/\/leemcq\.github\.io\/joy-in-the-journey\/bibles\/.*\.json$/,
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
