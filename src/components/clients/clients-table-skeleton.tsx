import { Skeleton } from "@/components/ui/skeleton";

export function ClientsTableSkeleton({
  rowCount = 5,
}: {
  readonly rowCount?: number;
}) {
  return (
    <div className="space-y-0">
      {/* Table header skeleton */}
      <div className="border-border/60 flex items-center gap-4 border-b px-4 py-3">
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-4 w-[60px]" />
        <Skeleton className="h-4 w-[60px]" />
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-4 w-[120px]" />
        <Skeleton className="h-4 w-[80px]" />
      </div>

      {/* Table rows skeleton */}
      {Array.from({ length: rowCount }, (_, i) => (
        <div
          key={`skeleton-row-${i}`}
          className="border-border/40 flex items-center gap-4 border-b px-4 py-4 last:border-b-0"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          {/* Avatar + Name */}
          <div className="flex w-[200px] items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-3 w-[80px] opacity-60" />
            </div>
          </div>

          {/* Age */}
          <Skeleton className="h-4 w-[40px]" />

          {/* State */}
          <Skeleton className="h-4 w-[40px]" />

          {/* Last Updated */}
          <Skeleton className="h-4 w-[90px]" />

          {/* Insurance Needs */}
          <Skeleton className="h-4 w-[100px]" />

          {/* Status Badge */}
          <Skeleton className="h-5 w-[60px] rounded-full" />
        </div>
      ))}
    </div>
  );
}
