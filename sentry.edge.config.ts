// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { env } from "@/env";

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
    // Adjust this in production
    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Configure environment
    environment: env.NODE_ENV,

    // Enable debug mode in development
    debug: env.NODE_ENV === "development",
  });
}
