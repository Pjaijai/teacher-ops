"use client";

import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Start/stop dictation. Pulses while listening. Render only when speech recognition is supported. */
export function MicButton({
  listening,
  onStart,
  onStop,
  labels,
  disabled,
}: {
  listening: boolean;
  onStart: () => void;
  onStop: () => void;
  labels: { start: string; stop: string };
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant={listening ? "destructive" : "outline"}
      onClick={listening ? onStop : onStart}
      disabled={disabled}
      aria-label={listening ? labels.stop : labels.start}
      aria-pressed={listening}
      title={listening ? labels.stop : labels.start}
      className={cn(listening && "animate-pulse")}
    >
      {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
    </Button>
  );
}
