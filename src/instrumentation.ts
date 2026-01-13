import * as Sentry from "@sentry/nextjs";

export async function register() {
  // Initialize OpenTelemetry in Node.js runtime
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initializeOTel, getOTelConfigFromEnv } =
      await import("./server/tracing/otel");
    initializeOTel(getOTelConfigFromEnv());

    // Initialize Sentry
    await import("../sentry.server.config");
  }

  // Edge runtime - only Sentry (OpenTelemetry SDK doesn't support Edge)
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
