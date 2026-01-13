/**
 * Tracing Module - Structured Logging & Observability
 *
 * This module provides OpenTelemetry-based tracing and structured logging
 * following the "One Event Per Request" (Canonical Logging) pattern.
 *
 * ## Quick Start
 *
 * Wrap your API routes with `withTracing`:
 *
 * ```ts
 * import { withTracing } from "@/server/tracing";
 *
 * export const GET = withTracing(async (request, ctx) => {
 *   ctx.addAttribute("customField", "value");
 *   return Response.json({ data: "hello" });
 * });
 * ```
 *
 * ## Features
 *
 * - OpenTelemetry traces exported to Grafana Cloud
 * - Automatic request context propagation via AsyncLocalStorage
 * - User context extraction from Better Auth sessions
 * - Single canonical log event per request
 * - Trace-log correlation (trace_id, span_id)
 *
 * @module
 */

// API Route Wrappers
export {
  withTracing,
  withTracingPublic,
  tracedJson,
  tracedError,
  type TracingContext,
  type TracedRouteHandler,
  type TracingOptions,
} from "./api";

// Request Context
export {
  getRequestContext,
  requireRequestContext,
  addRequestAttribute,
  addRequestAttributes,
  setUserContext,
  withRequestContext,
  getRequestDuration,
  type RequestContext,
  type CreateRequestContextOptions,
} from "./context";

// Logger
export {
  log,
  emitLog,
  emitRequestLog,
  createChildLogger,
  type LogLevel,
  type CanonicalLogEvent,
} from "./logger";

// Auth Context
export {
  getUserFromSession,
  setUserContextFromSession,
  isAuthenticated,
  type UserInfo,
} from "./auth";

// OpenTelemetry Configuration (for advanced usage)
export { initializeOTel, getOTelConfigFromEnv, isOTelConfigured } from "./otel";
