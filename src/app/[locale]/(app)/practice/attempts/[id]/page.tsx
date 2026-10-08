import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AttemptResult } from "@/features/practice/components/attempt-result";

export default function AttemptResultRoute({ params }: { params: Promise<{ locale: string; id: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      {params.then(({ id }) => (
        <AttemptResult attemptId={id} />
      ))}
    </Suspense>
  );
}
