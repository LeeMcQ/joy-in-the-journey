/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/**
 * true only in the Android app build (`vite build --mode android`); set by
 * `define` in vite.config.ts. A literal at every use site, so the web build
 * drops Android-only branches (and their dynamic imports) entirely.
 */
declare const __ANDROID_APP__: boolean;
