import { Skeleton } from "@/components/ui/skeleton";

export function ClientsTableSkeleton({
  rowCount = 5,
}: {
  readonly rowCount?: number;
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rowCount }, (_, i) => (
        <div key={`skeleton-row-${i}`} className="flex space-x-4">
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}
