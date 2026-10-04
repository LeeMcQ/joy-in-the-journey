/* ================================================================== */
/*  Android app build: which Bible files ship inside the APK.          */
/*  Plain constants only (no import.meta), because vite.config.ts      */
/*  imports this file too, to prune everything else from dist-android. */
/* ================================================================== */

/** Live GitHub Pages site. The Android app downloads non-bundled Bibles from here. */
export const WEB_SITE_BASE = "https://leemcq.github.io/joy-in-the-journey/";

/**
 * Public-domain Bibles bundled in the APK, so they read offline from the first
 * launch. Paths are relative to public/. Every other file under public/bibles/
 * is removed from the Android build and downloaded from WEB_SITE_BASE instead
 * (GitHub Pages sends Access-Control-Allow-Origin: *).
 *   - AFR 1933/53: not bundled until its public-domain status is confirmed.
 *   - XHO75: © 1975 Bible Society of SA, must NOT be redistributed in the APK.
 */
export const ANDROID_BUNDLED_BIBLES = ["bibles/kjv.json", "bibles/web.json"];
