export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-5 pt-12 pb-8 animate-pulse">
      {/* Header skeleton */}
      <div className="h-4 w-24 rounded bg-surface" />
      <div className="h-8 w-48 rounded bg-surface" />
      <div className="h-3 w-64 rounded bg-surface" />

      {/* Card skeletons */}
      <div className="mt-4 h-20 rounded-2xl bg-surface" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-24 rounded-2xl bg-surface" />
        <div className="h-24 rounded-2xl bg-surface" />
        <div className="h-24 rounded-2xl bg-surface" />
      </div>
      <div className="h-16 rounded-2xl bg-surface" />
      <div className="h-16 rounded-2xl bg-surface" />
    </div>
  );
}
