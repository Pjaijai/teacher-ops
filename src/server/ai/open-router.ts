import { z } from "zod";
import { requireSetting } from "@/server/env";
import { modelFor, type ModelTier } from "./models";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export class AiError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

export type ImageInput = {
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  data: string; // base64, no data: prefix
};

export type AiUsage = { model: string; inputTokens: number | null; outputTokens: number | null; costUsd: number | null; latencyMs: number };

/** Called after every model call so cost can be logged against the student and the job. */
export type UsageSink = (purpose: string, usage: AiUsage) => Promise<void> | void;

type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

/** One AI call that must return JSON matching `schema`. */
export async function askStructured<S extends z.ZodType>(opts: {
  purpose: string;
  tier: ModelTier;
  system: string;
  text: string;
  images?: ImageInput[];
  schema: S;
  effort?: "low" | "medium" | "high";
  onUsage?: UsageSink;
}): Promise<z.infer<S>> {
  const apiKey = requireSetting("OPENROUTER_API_KEY");
  const model = modelFor(opts.tier);
  const { $schema: _ignored, ...jsonSchema } = z.toJSONSchema(opts.schema) as Record<string, unknown>;

  const content: ContentPart[] = [
    ...(opts.images ?? []).map(
      (img): ContentPart => ({ type: "image_url", image_url: { url: `data:${img.mediaType};base64,${img.data}` } }),
    ),
    { type: "text", text: opts.text },
  ];

  const started = Date.now();
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "HKDSE Practice" },
    body: JSON.stringify({
      model,
      max_tokens: 16000,
      reasoning: { effort: opts.effort ?? (opts.tier === "top" ? "high" : "medium") },
      response_format: { type: "json_schema", json_schema: { name: opts.purpose.replace(/\W/g, "_"), strict: true, schema: jsonSchema } },
      provider: { require_parameters: true },
      usage: { include: true },
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content },
      ],
    }),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.error?.message ?? res.statusText;
    if (res.status === 401) throw new AiError("The AI service rejected our API key.", 500);
    if (res.status === 402) throw new AiError("The AI service is out of credits. Please try again later.", 503);
    if (res.status === 429) throw new AiError("The AI service is busy. Please try again in a moment.", 503);
    throw new AiError(`AI service error ${res.status}: ${msg}`);
  }

  await opts.onUsage?.(opts.purpose, {
    model,
    inputTokens: body?.usage?.prompt_tokens ?? null,
    outputTokens: body?.usage?.completion_tokens ?? null,
    costUsd: typeof body?.usage?.cost === "number" ? body.usage.cost : null,
    latencyMs: Date.now() - started,
  });

  const choice = body?.choices?.[0];
  if (choice?.finish_reason === "length") throw new AiError("The AI response was cut off (too long).");
  const raw: unknown = choice?.message?.content;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new AiError(choice?.message?.refusal ? "The AI declined this request." : "The AI returned an empty response.");
  }

  let json: unknown;
  try {
    // Some providers wrap JSON in a code fence despite response_format.
    json = JSON.parse(raw.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, ""));
  } catch {
    throw new AiError("The AI returned invalid JSON. Please try again.");
  }
  const parsed = opts.schema.safeParse(json);
  if (!parsed.success) {
    console.error(opts.purpose, parsed.error);
    throw new AiError("The AI returned output in an unexpected format. Please try again.");
  }
  return parsed.data;
}

/**
 * Speech to text, streamed: one audio clip in, the transcript out as it is written (async iterator of text deltas).
 * Reasoning is kept minimal so the first words arrive in about a second.
 */
export async function* streamTranscript(opts: { purpose: string; model: string; system: string; audioWavBase64: string; hint?: string }) {
  const apiKey = requireSetting("OPENROUTER_API_KEY");
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "HKDSE Practice" },
    body: JSON.stringify({
      model: opts.model,
      stream: true,
      max_tokens: 2000,
      reasoning: { effort: "minimal" },
      messages: [
        { role: "system", content: opts.system },
        {
          role: "user",
          content: [
            ...(opts.hint ? [{ type: "text", text: opts.hint }] : []),
            { type: "input_audio", input_audio: { data: opts.audioWavBase64, format: "wav" } },
          ],
        },
      ],
    }),
  });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    if (res.status === 402) throw new AiError("The AI service is out of credits. Please try again later.", 503);
    if (res.status === 429) throw new AiError("The AI service is busy. Please try again in a moment.", 503);
    throw new AiError(`AI service error ${res.status}: ${body?.error?.message ?? res.statusText}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let i: number;
    while ((i = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, i).trim();
      buffer = buffer.slice(i + 1);
      if (!line.startsWith("data:") || line === "data: [DONE]") continue;
      const data = JSON.parse(line.slice(5)) as { error?: { message?: string }; choices?: { delta?: { content?: string } }[] };
      if (data.error) throw new AiError(`AI service error: ${data.error.message ?? "stream failed"}`);
      const text = data.choices?.[0]?.delta?.content;
      if (text) yield text;
    }
  }
}
