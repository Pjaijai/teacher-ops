import { AiError } from "./ai";

/** Embeddings go through OpenRouter too, so one API key covers everything. */
const OPENROUTER_EMBED_URL = "https://openrouter.ai/api/v1/embeddings";
const DEFAULT_EMBED_MODEL = "qwen/qwen3-embedding-8b";

export function embedModel() {
  return process.env.OPENROUTER_EMBED_MODEL || DEFAULT_EMBED_MODEL;
}

/** Embed texts in batches; returns unit-length vectors in input order. */
export async function embed(texts: string[], batchSize = 32): Promise<number[][]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new AiError("OPENROUTER_API_KEY is not set (add it to .env.local and restart).");

  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const res = await fetch(OPENROUTER_EMBED_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "Teacher Ops" },
      body: JSON.stringify({ model: embedModel(), input: batch }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new AiError(`OpenRouter embeddings error ${res.status}: ${body?.error?.message ?? res.statusText}`);
    const data = (body?.data ?? []) as { index: number; embedding: number[] }[];
    if (data.length !== batch.length) throw new AiError("OpenRouter returned the wrong number of embeddings.");
    for (const d of data.sort((a, b) => a.index - b.index)) out.push(normalize(d.embedding));
  }
  return out;
}

function normalize(v: number[]) {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}

/** Cosine similarity of two unit vectors. */
export function cosine(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
