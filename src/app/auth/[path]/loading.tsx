import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state for auth pages (sign-in, sign-up, etc.).
 * Displays skeleton placeholders matching the auth form layout.
 */
export default function AuthLoading() {
  return (
    <main className="container flex min-h-screen grow flex-col items-center justify-center self-center p-4 md:p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Title placeholder */}
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>

        {/* Form fields placeholders */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        {/* Submit button placeholder */}
        <Skeleton className="h-10 w-full" />

        {/* Footer links placeholder */}
        <div className="flex justify-center gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </main>
  );
}
