import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Loading state for auth pages (sign-in, sign-up, etc.).
 * Displays skeleton placeholders matching the auth form layout.
 */
export default function AuthLoading() {
  return (
    <main
      className="bg-muted/30 flex min-h-[calc(100vh-3.5rem)] w-full items-center justify-center p-4"
      aria-label="Loading page..."
    >
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <Skeleton className="mx-auto h-6 w-24" />
          <Skeleton className="mx-auto h-4 w-40" />
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>

          <Skeleton className="h-9 w-full" />

          <div className="flex justify-center gap-3 pt-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
