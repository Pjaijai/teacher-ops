"use client";

import { Loader2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Start/stop voice input. Green while recording, with a ring that grows with the voice level (0–1);
 * a spinner while the last words are still being transcribed.
 */
export function MicButton({
  listening,
  transcribing = false,
  level = 0,
  onStart,
  onStop,
  labels,
  disabled,
}: {
  listening: boolean;
  transcribing?: boolean;
  level?: number;
  onStart: () => void;
  onStop: () => void;
  labels: { start: string; stop: string };
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant={listening ? "default" : "outline"}
      onClick={listening ? onStop : onStart}
      disabled={disabled}
      aria-label={listening ? labels.stop : labels.start}
      aria-pressed={listening}
      title={listening ? labels.stop : labels.start}
      className={cn("relative shrink-0 transition-shadow", listening && "border-green-600 bg-green-600 text-white hover:bg-green-700")}
      style={listening ? { boxShadow: `0 0 0 ${2 + Math.round(level * 8)}px rgb(22 163 74 / 0.25)` } : undefined}
    >
      {!listening && transcribing ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
    </Button>
  );
}
