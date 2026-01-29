/**
 * Root loading state for the application.
 * Displays a centered spinner while the page is loading.
 */
export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-600 border-t-white" />
        <p className="text-sm text-slate-400">Loading...</p>
      </div>
    </main>
  );
}
