/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/**
 * true only in the Android app build (`vite build --mode android`); set by
 * `define` in vite.config.ts. A literal at every use site, so the web build
 * drops Android-only branches (and their dynamic imports) entirely.
 */
declare const __ANDROID_APP__: boolean;

/* Web Speech API (not in every TypeScript DOM lib revision). */
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((event: Event) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

declare var SpeechRecognition: { new (): SpeechRecognition; prototype: SpeechRecognition };

interface Window {
  SpeechRecognition?: { new (): SpeechRecognition };
  webkitSpeechRecognition?: { new (): SpeechRecognition };
}
