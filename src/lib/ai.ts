import { z } from "zod";

/**
 * All AI calls go through OpenRouter's OpenAI-compatible chat completions API.
 * Model is configurable; it must support image input and JSON-schema structured output.
 */
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-opus-5.5";

export function aiModel() {
  return process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
}

export type ImageInput = {
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  data: string; // base64, no data: prefix
};

export class AiError extends Error {}

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

/** One AI call that must return JSON matching `schema`. */
export async function askStructured<S extends z.ZodType>(opts: {
  name: string;
  system: string;
  text: string;
  images?: ImageInput[];
  schema: S;
  effort?: "low" | "medium" | "high";
}): Promise<z.infer<S>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new AiError("OPENROUTER_API_KEY is not set (add it to .env.local and restart).");

  const { $schema: _ignored, ...jsonSchema } = z.toJSONSchema(opts.schema) as Record<string, unknown>;

  const content: ContentPart[] = [
    ...(opts.images ?? []).map(
      (img): ContentPart => ({ type: "image_url", image_url: { url: `data:${img.mediaType};base64,${img.data}` } }),
    ),
    { type: "text", text: opts.text },
  ];

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "Teacher Ops",
    },
    body: JSON.stringify({
      model: aiModel(),
      max_tokens: 16000,
      reasoning: { effort: opts.effort ?? "high" },
      response_format: {
        type: "json_schema",
        json_schema: { name: opts.name, strict: true, schema: jsonSchema },
      },
      provider: { require_parameters: true },
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content },
      ],
    }),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.error?.message ?? res.statusText;
    if (res.status === 401) {
      throw new AiError(
        "OpenRouter rejected the API key (check OPENROUTER_API_KEY). It must be a normal API key from openrouter.ai/keys — management/provisioning keys can't call models.",
      );
    }
    if (res.status === 402) throw new AiError("OpenRouter account is out of credits.");
    if (res.status === 429) throw new AiError("Rate limited by OpenRouter — wait a moment and try again.");
    throw new AiError(`OpenRouter error ${res.status}: ${msg}`);
  }

  const choice = body?.choices?.[0];
  if (choice?.finish_reason === "length") {
    throw new AiError("The AI response was cut off (too long). Try fewer questions or a shorter input.");
  }
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
    console.error(parsed.error);
    throw new AiError("The AI returned output in an unexpected format. Please try again.");
  }
  return parsed.data;
}

/** Wrap a route handler body so errors come back as `{ error }` JSON. */
export async function jsonRoute(fn: () => Promise<unknown>): Promise<Response> {
  try {
    return Response.json(await fn());
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
