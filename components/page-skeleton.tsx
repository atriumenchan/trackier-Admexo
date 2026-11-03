import { Skeleton } from "@/components/ui";

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-[92px]" />)}
      </div>
      <div className="surface-card mt-4 p-4">
        <Skeleton className="h-4 w-40" />
        {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="mt-4 h-9" />)}
      </div>
    </div>
  );
}
