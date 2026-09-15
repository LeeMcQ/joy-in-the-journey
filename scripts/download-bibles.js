#!/usr/bin/env node
/**
 * Intentionally a no-op.
 *
 * Deploy used to regenerate public/bibles/kjv.json & web.json from bible-api.com
 * as incomplete chapter-maps (~270–285 chapters). The app expects the committed
 * full verses-format files (~6MB, 66 books). Ship those from the repo instead.
 *
 * Kept so older workflow steps that still call `npm run download-bibles` are safe.
 */
console.log("download-bibles: skipped — shipping committed public/bibles/* (full verses JSON).");
process.exit(0);
