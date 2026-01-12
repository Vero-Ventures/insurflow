// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { env } from "@/env";

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
    // Adjust this in production
    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Set profilesSampleRate relative to tracesSampleRate
    profilesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Enable sending user PII (Personally Identifiable Information)
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
    sendDefaultPii: true,

    // Configure environment
    environment: env.NODE_ENV,

    // Enable debug mode in development
    debug: env.NODE_ENV === "development",

    beforeSend(event) {
      // Don't send events for local development
      if (env.NODE_ENV === "development") {
        console.log("Sentry event captured:", event);
        return null;
      }
      return event;
    },
  });
}
