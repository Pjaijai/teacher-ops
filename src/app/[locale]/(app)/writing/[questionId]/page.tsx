import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskScreen } from "@/features/writing/components/task-screen";

export default function WritingTaskPage({ params }: PageProps<"/[locale]/writing/[questionId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      {params.then(({ questionId }) => (
        <TaskScreen questionId={questionId} />
      ))}
    </Suspense>
  );
}
