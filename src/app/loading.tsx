/**
 * Root loading state for the application.
 * Displays a centered spinner while the page is loading.
 */
export default function Loading() {
  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4" role="status">
        <div className="border-muted-foreground/30 border-t-primary h-10 w-10 animate-spin rounded-full border-4" />
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </main>
  );
}
