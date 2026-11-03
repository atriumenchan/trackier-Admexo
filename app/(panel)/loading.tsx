export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-sm bg-surface-2" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-20 animate-pulse rounded-sm bg-surface-2" />
        <div className="h-20 animate-pulse rounded-sm bg-surface-2" />
        <div className="h-20 animate-pulse rounded-sm bg-surface-2" />
        <div className="h-20 animate-pulse rounded-sm bg-surface-2" />
      </div>
      <div className="h-40 animate-pulse rounded-sm bg-surface-2" />
    </div>
  );
}
