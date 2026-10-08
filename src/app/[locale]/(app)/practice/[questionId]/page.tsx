import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PracticeQuestionPage } from "@/features/practice/components/practice-question-page";

export default function PracticeQuestionRoute({ params }: { params: Promise<{ locale: string; questionId: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      {params.then(({ questionId }) => (
        <PracticeQuestionPage questionId={questionId} />
      ))}
    </Suspense>
  );
}
