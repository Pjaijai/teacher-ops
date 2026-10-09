"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Voice input with AI speech-to-text, streamed. The mic is recorded in the browser and cut into phrases at pauses
 * (or every MAX_SEGMENT_S); each phrase goes to /api/ai/speech/transcribe as 16 kHz mono WAV and its transcript
 * streams back word by word, while the student keeps talking. Phrases are transcribed in order.
 */

const TARGET_RATE = 16000;
const SILENCE_MS = 700; // a pause this long ends a phrase
const MAX_SEGMENT_S = 20; // keeps each upload small (~640 KB base64)
const MIN_VOICED_MS = 250; // shorter blips (clicks, coughs) are dropped
const PRE_ROLL_CHUNKS = 2; // keep a little audio from before the voice starts so first syllables aren't clipped

export type DictationError = "not-allowed" | "no-mic" | "failed";

export function useAiDictation({ onText, hint }: { onText: (chunk: string, startsPhrase: boolean) => void; hint?: string }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<DictationError | null>(null);

  const onTextRef = useRef(onText);
  onTextRef.current = onText;
  const session = useRef<{ stop: () => void } | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    setSupported(typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof AudioContext !== "undefined");
    return () => session.current?.stop();
  }, []);

  /** Send one phrase; phrases run one after another so the text stays in order. */
  const transcribe = useCallback(
    (wavBase64: string) => {
      setPending((n) => n + 1);
      queue.current = queue.current.then(async () => {
        try {
          let first = true;
          for await (const chunk of streamTranscript(wavBase64, hint)) {
            onTextRef.current(chunk, first);
            first = false;
          }
        } catch {
          setError("failed");
        } finally {
          setPending((n) => n - 1);
        }
      });
    },
    [hint],
  );

  const start = useCallback(async () => {
    if (session.current) return;
    setError(null);
    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      setError(e instanceof DOMException && e.name === "NotAllowedError" ? "not-allowed" : "no-mic");
      return;
    }
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(media);
    // ScriptProcessor is deprecated but universally supported and enough for a mic level + buffering.
    const proc = ctx.createScriptProcessor(4096, 1, 1);
    const chunkMs = (4096 / ctx.sampleRate) * 1000;

    let chunks: Float32Array[] = [];
    let voicedMs = 0;
    let silentMs = 0;
    let noiseFloor = 0.004;

    const flush = () => {
      if (voicedMs >= MIN_VOICED_MS) transcribe(toBase64(encodeWav(downsample(concat(chunks), ctx.sampleRate, TARGET_RATE), TARGET_RATE)));
      chunks = [];
      voicedMs = 0;
      silentMs = 0;
    };

    proc.onaudioprocess = (e) => {
      const input = new Float32Array(e.inputBuffer.getChannelData(0));
      let sum = 0;
      for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
      const rms = Math.sqrt(sum / input.length);
      const threshold = Math.max(0.012, noiseFloor * 3);
      const voiced = rms > threshold;
      if (!voiced) noiseFloor = noiseFloor * 0.95 + rms * 0.05;
      setLevel(Math.min(1, rms / 0.1));

      chunks.push(input);
      if (voiced) {
        voicedMs += chunkMs;
        silentMs = 0;
      } else if (voicedMs > 0) {
        silentMs += chunkMs;
      } else if (chunks.length > PRE_ROLL_CHUNKS) {
        chunks = chunks.slice(-PRE_ROLL_CHUNKS); // still waiting for speech
      }
      const lengthMs = chunks.length * chunkMs;
      if ((voicedMs > 0 && silentMs >= SILENCE_MS) || lengthMs >= MAX_SEGMENT_S * 1000) flush();
    };
    source.connect(proc);
    proc.connect(ctx.destination); // Chrome only runs the processor when it is connected

    session.current = {
      stop: () => {
        flush();
        proc.disconnect();
        source.disconnect();
        media.getTracks().forEach((t) => t.stop());
        void ctx.close();
        session.current = null;
        setListening(false);
        setLevel(0);
      },
    };
    setListening(true);
  }, [transcribe]);

  const stop = useCallback(() => session.current?.stop(), []);

  return { supported, listening, level, transcribing: pending > 0, error, start, stop };
}

// --- Transport -----------------------------------------------------------------------------

async function* streamTranscript(audio: string, hint?: string) {
  const res = await fetch("/api/ai/speech/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio, hint }),
  });
  if (!res.ok || !res.body) throw new Error(`Transcription failed (${res.status})`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const event = /^event:\s*(.*)$/m.exec(block)?.[1]?.trim();
      const data = /^data:\s*(.*)$/m.exec(block)?.[1] ?? "{}";
      if (event === "delta") yield (JSON.parse(data) as { text: string }).text;
      else if (event === "failed") throw new Error((JSON.parse(data) as { error: string }).error);
    }
  }
}

// --- Audio helpers -----------------------------------------------------------------------------

function concat(chunks: Float32Array[]) {
  const out = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/** Average-pool down to the target rate (speech only needs 16 kHz). */
function downsample(input: Float32Array, from: number, to: number) {
  if (to >= from) return input;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    out[i] = sum / Math.max(1, end - start);
  }
  return out;
}

/** 16-bit PCM mono WAV. */
function encodeWav(samples: Float32Array, rate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, s: string) => [...s].forEach((ch, i) => view.setUint8(offset + i, ch.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
