"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="bg-background flex min-h-screen flex-col items-center justify-center p-4">
          <div className="max-w-md space-y-4 text-center">
            <h1 className="text-4xl font-bold">Something went wrong!</h1>
            <p className="text-muted-foreground">
              We&apos;ve been notified and are looking into it.
            </p>
            {error.digest && (
              <p className="text-muted-foreground text-sm">
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
