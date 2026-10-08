import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmissionScreen } from "@/features/writing/components/submission-screen";

export default function WritingSubmissionPage({ params }: PageProps<"/[locale]/writing/submissions/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      {params.then(({ id }) => (
        <SubmissionScreen id={id} />
      ))}
    </Suspense>
  );
}
