import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Loading state for auth pages (sign-in, sign-up, etc.).
 * Displays skeleton placeholders matching the auth form layout.
 */
export default function AuthLoading() {
  return (
    <main
      className="bg-muted/30 flex min-h-[calc(100vh-3.5rem)] w-full items-center justify-center p-4 md:p-6"
      aria-label="Loading page..."
    >
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          {/* Logo/Title placeholder */}
          <Skeleton className="mx-auto h-8 w-32" />
          <Skeleton className="mx-auto h-4 w-48" />
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Form fields placeholders */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Submit button placeholder */}
          <Skeleton className="h-10 w-full" />

          {/* Footer links placeholder */}
          <div className="flex justify-center gap-4 pt-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
