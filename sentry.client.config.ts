import * as Sentry from "@sentry/nextjs";
import { env } from "@/env";

if (env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: env.NEXT_PUBLIC_SENTRY_DSN,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
    // Adjust this in production
    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Set profilesSampleRate relative to tracesSampleRate
    profilesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Capture Replay for 10% of all sessions in production, 100% in development
    replaysSessionSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Capture 100% of sessions with errors
    replaysOnErrorSampleRate: 1.0,

    // Configure environment
    environment: env.NODE_ENV,

    // Enable debug mode in development
    debug: env.NODE_ENV === "development",

    // Filter out noise
    ignoreErrors: [
      // Browser extensions
      "top.GLOBALS",
      // Random plugins/extensions
      "originalCreateNotification",
      "canvas.contentDocument",
      "MyApp_RemoveAllHighlights",
      // Network errors
      "NetworkError",
      "Network request failed",
    ],

    beforeSend(event) {
      // Don't send events for local development
      if (
        typeof window !== "undefined" &&
        window.location.hostname === "localhost"
      ) {
        return null;
      }
      return event;
    },
  });
}
