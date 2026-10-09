"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Voice to text with the browser's own speech recognition (Web Speech API): free, no server call.
 * Chrome, Edge and Safari support it; elsewhere `supported` is false and callers hide the mic.
 */

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Speech language for a UI locale: Cantonese for zh-HK, else English. */
export const speechLang = (locale: string) => (locale === "zh-HK" ? "zh-HK" : "en-GB");

export function useSpeechToText({ lang, onFinal }: { lang: string; onFinal: (text: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  // Decided after mount so the server render and the first client render match.
  useEffect(() => {
    setSupported(recognitionCtor() !== null);
    return () => rec.current?.abort();
  }, []);

  const stop = useCallback(() => rec.current?.stop(), []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor || rec.current) return;
    const r = new Ctor();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) onFinalRef.current(res[0].transcript.trim());
        else live += res[0].transcript;
      }
      setInterim(live);
    };
    r.onerror = (e) => {
      if (e.error !== "aborted" && e.error !== "no-speech") setError(e.error);
    };
    r.onend = () => {
      rec.current = null;
      setListening(false);
      setInterim("");
    };
    rec.current = r;
    setError(null);
    setListening(true);
    r.start();
  }, [lang]);

  return { supported, listening, interim, error, start, stop };
}
