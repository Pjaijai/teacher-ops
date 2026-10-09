import { setting } from "@/server/env";

/**
 * Which model does what. Light tasks (helpers, 解題, question generation) use a cheaper model;
 * reading handwriting, grading, marking and level samples use the top model.
 */
export type ModelTier = "top" | "light";

const DEFAULTS: Record<ModelTier, string> = {
  top: "anthropic/claude-opus-5.5",
  light: "anthropic/claude-sonnet-5.5",
};

export function modelFor(tier: ModelTier): string {
  if (tier === "top") return setting("OPENROUTER_MODEL_TOP") ?? setting("OPENROUTER_MODEL") ?? DEFAULTS.top;
  return setting("OPENROUTER_MODEL_LIGHT") ?? DEFAULTS.light;
}

export function embedModel() {
  return setting("OPENROUTER_EMBED_MODEL") ?? "qwen/qwen3-embedding-8b";
}

/** Speech to text (voice input): an audio-capable model, fast with minimal reasoning. */
export function audioModel() {
  return setting("OPENROUTER_MODEL_AUDIO") ?? "google/gemini-3.8-flash";
}
