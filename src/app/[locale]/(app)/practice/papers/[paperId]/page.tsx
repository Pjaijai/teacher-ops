import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PaperPage } from "@/features/papers/components/paper-page";

export default function PaperRoute({ params }: { params: Promise<{ locale: string; paperId: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      {params.then(({ paperId }) => (
        <PaperPage paperId={paperId} />
      ))}
    </Suspense>
  );
}
