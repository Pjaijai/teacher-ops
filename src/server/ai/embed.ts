import { EMBEDDING_DIMS } from "@/server/db/schema/columns";
import { requireSetting } from "@/server/env";
import { AiError } from "./open-router";
import { embedModel } from "./models";

const OPENROUTER_EMBED_URL = "https://openrouter.ai/api/v1/embeddings";

/**
 * Embed texts in batches. qwen3-embedding is Matryoshka-trained, so we keep the first
 * EMBEDDING_DIMS dimensions and renormalise (cosine distance in pgvector).
 */
export async function embed(texts: string[], batchSize = 32): Promise<number[][]> {
  const apiKey = requireSetting("OPENROUTER_API_KEY");
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const res = await fetch(OPENROUTER_EMBED_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "HKDSE Practice" },
      body: JSON.stringify({ model: embedModel(), input: batch, dimensions: EMBEDDING_DIMS }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new AiError(`Embedding error ${res.status}: ${body?.error?.message ?? res.statusText}`);
    const data = (body?.data ?? []) as { index: number; embedding: number[] }[];
    if (data.length !== batch.length) throw new AiError("The embedding service returned the wrong number of vectors.");
    for (const d of data.sort((a, b) => a.index - b.index)) out.push(truncate(d.embedding));
  }
  return out;
}

export async function embedOne(text: string) {
  const [v] = await embed([text]);
  return v;
}

function truncate(v: number[]) {
  const head = v.slice(0, EMBEDDING_DIMS);
  const n = Math.hypot(...head) || 1;
  return head.map((x) => x / n);
}
