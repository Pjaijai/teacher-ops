import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PaperPrint } from "@/features/papers/components/paper-print";

export default function PaperPrintRoute({ params }: { params: Promise<{ locale: string; paperId: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      {params.then(({ paperId }) => (
        <PaperPrint paperId={paperId} />
      ))}
    </Suspense>
  );
}
