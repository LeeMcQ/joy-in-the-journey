/* ================================================================== */
/*  useDictation — wire a controlled input/textarea to speech-to-text */
/* ================================================================== */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  detectDictationBackend,
  dictationLanguage,
  friendlyDictationError,
  insertTranscript,
  startDictation,
  type DictationBackend,
} from "@/lib/dictation";
import { useAppStore } from "@/store/useAppStore";

export interface UseDictationOptions {
  /** Current controlled value. */
  value: string;
  /** React state setter / onChange for the controlled field. */
  onChange: (next: string) => void;
  /** Ref to the <input> or <textarea> (for caret position). */
  inputRef?: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  /** Optional language override (BCP-47). */
  language?: string;
}

export interface UseDictationResult {
  /** true once we know a backend exists (or not). */
  ready: boolean;
  available: boolean;
  backend: DictationBackend;
  listening: boolean;
  toggle: () => void;
  stop: () => void;
}

export function useDictation({
  value,
  onChange,
  inputRef,
  language,
}: UseDictationOptions): UseDictationResult {
  const bibleVersion = useAppStore((s) => s.settings.bibleVersion);
  const [backend, setBackend] = useState<DictationBackend>("none");
  const [ready, setReady] = useState(false);
  const [listening, setListening] = useState(false);

  const stopRef = useRef<(() => void) | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Value + caret frozen when listening starts. Every partial/final is the
  // full hypothesis for this utterance, rebuilt from this base.
  const baseRef = useRef({ value: "", start: 0, end: 0 });

  useEffect(() => {
    let cancelled = false;
    void detectDictationBackend().then((b) => {
      if (!cancelled) {
        setBackend(b);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const stop = useCallback(() => {
    const s = stopRef.current;
    stopRef.current = null;
    if (s) s();
    setListening(false);
  }, []);

  // Stop on unmount.
  useEffect(() => () => { stop(); }, [stop]);

  const applyChunk = useCallback((chunk: string, commitBase: boolean) => {
    const { value: base, start, end } = baseRef.current;
    const { next, caret } = insertTranscript(base, chunk, start, end);
    onChangeRef.current(next);
    if (commitBase) {
      baseRef.current = { value: next, start: caret, end: caret };
    }
    const el = inputRef?.current;
    if (el) {
      requestAnimationFrame(() => {
        try { el.focus(); el.setSelectionRange(caret, caret); } catch { /* ignore */ }
      });
    }
  }, [inputRef]);

  const start = useCallback(async () => {
    if (stopRef.current) return;
    const el = inputRef?.current;
    const startSel = el?.selectionStart ?? valueRef.current.length;
    const endSel = el?.selectionEnd ?? startSel;
    baseRef.current = {
      value: valueRef.current,
      start: startSel,
      end: endSel,
    };

    const lang = language || dictationLanguage(bibleVersion);
    setListening(true);

    const stopFn = await startDictation(lang, {
      onPartial: (text) => applyChunk(text, false),
      onFinal: (text) => applyChunk(text, true),
      onState: (isOn) => {
        setListening(isOn);
        if (!isOn) stopRef.current = null;
      },
      onError: (message) => {
        friendlyDictationError(message);
        setListening(false);
        stopRef.current = null;
      },
    });

    stopRef.current = () => {
      stopFn();
      setListening(false);
      stopRef.current = null;
    };
  }, [applyChunk, bibleVersion, inputRef, language]);

  const toggle = useCallback(() => {
    if (listening || stopRef.current) stop();
    else void start();
  }, [listening, start, stop]);

  return {
    ready,
    available: backend !== "none",
    backend,
    listening,
    toggle,
    stop,
  };
}
