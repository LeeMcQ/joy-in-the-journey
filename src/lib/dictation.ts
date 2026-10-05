/* ================================================================== */
/*  Speech-to-text helpers (Capacitor on Android, Web Speech on web). */
/*                                                                    */
/*  Safe for the live website: the Capacitor plugin is only imported  */
/*  when __ANDROID_APP__ is true (compile-time literal). On the web  */
/*  build we use webkitSpeechRecognition when present, and hide the  */
/*  mic when nothing is available.                                    */
/* ================================================================== */

import { showToast } from "@/components/ui/Toast";

export type DictationBackend = "native" | "web" | "none";

type PartialListener = (text: string) => void;
type FinalListener = (text: string) => void;
type StateListener = (listening: boolean) => void;

interface SessionHandlers {
  onPartial: PartialListener;
  onFinal: FinalListener;
  onState: StateListener;
  onError: (message: string) => void;
}

/** Only one field may listen at a time. */
let activeStop: (() => void) | null = null;

export function claimDictation(stop: () => void): void {
  if (activeStop && activeStop !== stop) {
    try { activeStop(); } catch { /* ignore */ }
  }
  activeStop = stop;
}

export function releaseDictation(stop: () => void): void {
  if (activeStop === stop) activeStop = null;
}

/** Language for the recognizer. No app-level UI language setting exists;
 *  follow the active Bible translation when it is Afrikaans/Xhosa, else
 *  the device locale (en-ZA preferred for English). */
export function dictationLanguage(bibleVersion?: string): string {
  const v = (bibleVersion ?? "").toLowerCase();
  if (v === "afr") return "af-ZA";
  if (v === "xho" || v === "xho75") return "xh-ZA";
  const nav = typeof navigator !== "undefined" ? navigator.language || "" : "";
  const lower = nav.toLowerCase();
  if (lower.startsWith("af")) return "af-ZA";
  if (lower.startsWith("xh")) return "xh-ZA";
  if (lower.startsWith("en")) return nav.includes("-") ? nav : "en-ZA";
  return nav || "en-ZA";
}

/**
 * Insert `chunk` into `value` at the selection, or append with a leading
 * space. Only replaces the whole field when it was empty.
 */
export function insertTranscript(
  value: string,
  chunk: string,
  selStart: number | null | undefined,
  selEnd: number | null | undefined,
): { next: string; caret: number } {
  const raw = (chunk ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return { next: value, caret: selStart ?? value.length };

  if (!value) {
    return { next: raw, caret: raw.length };
  }

  const start = selStart == null ? value.length : Math.max(0, Math.min(selStart, value.length));
  const end = selEnd == null ? start : Math.max(start, Math.min(selEnd, value.length));
  const before = value.slice(0, start);
  const after = value.slice(end);

  let text = raw;
  if (before.length > 0 && !/\s$/.test(before) && !/^\s/.test(text)) text = ` ${text}`;
  if (after.length > 0 && !/\s$/.test(text) && !/^\s/.test(after)) text = `${text} `;

  const next = before + text + after;
  return { next, caret: before.length + text.length };
}

function webSpeechCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export async function detectDictationBackend(): Promise<DictationBackend> {
  if (__ANDROID_APP__) {
    try {
      const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
      const { available } = await SpeechRecognition.available();
      if (available) return "native";
    } catch {
      /* fall through */
    }
    // Native plugin missing/unavailable: still try Web Speech inside the WebView.
  }
  return webSpeechCtor() ? "web" : "none";
}

async function ensureNativePermission(): Promise<boolean> {
  const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
  const cur = await SpeechRecognition.checkPermissions();
  if (cur.speechRecognition === "granted") return true;
  const next = await SpeechRecognition.requestPermissions();
  return next.speechRecognition === "granted";
}

/**
 * Start a dictation session. Returns a stop() function.
 * Prefer on-device recognition when the OS supports it; the community
 * plugin does not expose EXTRA_PREFER_OFFLINE, so Android may use the
 * cloud recognizer when a network is available. Offline language packs
 * still let it work with no network.
 */
export async function startDictation(
  language: string,
  handlers: SessionHandlers,
): Promise<() => void> {
  const backend = await detectDictationBackend();
  if (backend === "none") {
    handlers.onError("Dictation is not available on this device.");
    return () => undefined;
  }

  let stopped = false;
  let cleanup: () => void = () => undefined;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    try { cleanup(); } catch { /* ignore */ }
    releaseDictation(stop);
    handlers.onState(false);
  };

  claimDictation(stop);
  handlers.onState(true);

  const onVis = () => {
    if (document.visibilityState === "hidden") stop();
  };
  document.addEventListener("visibilitychange", onVis);
  const baseCleanup = () => document.removeEventListener("visibilitychange", onVis);

  try {
    if (backend === "native") {
      const ok = await ensureNativePermission();
      if (!ok) {
        baseCleanup();
        releaseDictation(stop);
        handlers.onState(false);
        handlers.onError("Microphone permission is needed for dictation.");
        stopped = true;
        return () => undefined;
      }

      const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
      let lastPartial = "";
      const partialHandle = await SpeechRecognition.addListener("partialResults", (data) => {
        const text = data.matches?.[0] ?? "";
        if (text) {
          lastPartial = text;
          handlers.onPartial(text);
        }
      });
      const stateHandle = await SpeechRecognition.addListener("listeningState", (data) => {
        if (data.status === "stopped" && !stopped) {
          if (lastPartial) handlers.onFinal(lastPartial);
          stop();
        }
      });

      cleanup = () => {
        baseCleanup();
        void partialHandle.remove();
        void stateHandle.remove();
        void SpeechRecognition.stop().catch(() => undefined);
      };

      // popup:false so partialResults work on Android. The community plugin does
      // not expose EXTRA_PREFER_OFFLINE, so Android may use a cloud recognizer
      // when a network is available; offline language packs still work offline.
      await SpeechRecognition.start({
        language,
        maxResults: 1,
        partialResults: true,
        popup: false,
      });
      return stop;
    }

    // Web Speech API fallback (website + WebView without native plugin)
    const Ctor = webSpeechCtor();
    if (!Ctor) {
      baseCleanup();
      releaseDictation(stop);
      handlers.onState(false);
      handlers.onError("Dictation is not available in this browser.");
      stopped = true;
      return () => undefined;
    }

    const rec = new Ctor();
    rec.lang = language;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let finalAccum = "";

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const t = res[0]?.transcript ?? "";
        if (res.isFinal) finalAccum += `${t} `;
        else interim += t;
      }
      const live = `${finalAccum}${interim}`.replace(/\s+/g, " ").trim();
      if (live) handlers.onPartial(live);
      if (finalAccum.trim()) {
        // Keep streaming; commit on stop so continuous mode can capture more.
      }
    };
    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      const err = event.error;
      if (err === "aborted" || err === "no-speech") {
        // Benign — user stopped or silence.
      } else if (err === "not-allowed" || err === "service-not-allowed") {
        handlers.onError("Microphone permission is needed for dictation.");
      } else if (err === "network") {
        handlers.onError("Dictation needs a network connection right now.");
      } else {
        handlers.onError("Dictation could not start. Please try again.");
      }
      stop();
    };
    rec.onend = () => {
      if (finalAccum.trim()) handlers.onFinal(finalAccum.trim());
      if (!stopped) stop();
    };

    cleanup = () => {
      baseCleanup();
      try { rec.stop(); } catch { /* ignore */ }
    };

    rec.start();
    return stop;
  } catch (e) {
    baseCleanup();
    releaseDictation(stop);
    handlers.onState(false);
    stopped = true;
    const msg = e instanceof Error ? e.message : String(e);
    if (/permission|denied|not.allowed/i.test(msg)) {
      handlers.onError("Microphone permission is needed for dictation.");
    } else if (/network|offline|unavailable/i.test(msg)) {
      handlers.onError("Dictation needs a network connection right now.");
    } else {
      handlers.onError("Dictation could not start. Please try again.");
    }
    return () => undefined;
  }
}

export function friendlyDictationError(message: string): void {
  showToast(message, { type: "error", duration: 3500 });
}
