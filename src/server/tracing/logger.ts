/**
 * Canonical Logger - "One Event Per Request" Pattern
 *
 * This logger implements the Canonical Logging (Wide Events) pattern from loggingsucks.com.
 * Instead of emitting multiple log events throughout a request, it accumulates context
 * and emits a single, comprehensive log event when the request completes.
 *
 * The logger integrates with:
 * - OpenTelemetry for trace correlation (trace_id, span_id)
 * - AsyncLocalStorage for automatic context propagation
 * - Grafana Cloud via OTLP for log export
 *
 * @see https://loggingsucks.com
 */

import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import {
  getRequestContext,
  getRequestDuration,
  type RequestContext,
} from "./context";

/**
 * Log severity levels
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

/**
 * Map log levels to OpenTelemetry severity numbers
 */
const severityMap: Record<LogLevel, SeverityNumber> = {
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
  fatal: SeverityNumber.FATAL,
};

/**
 * Structure of a canonical log event
 * This represents the "wide event" emitted at request completion
 */
export interface CanonicalLogEvent {
  // Timing
  timestamp: string;
  duration_ms: number;

  // Request identification
  request_id: string;
  trace_id: string;
  span_id: string;

  // User context
  user_id?: string;
  session_id?: string;

  // Request details
  method: string;
  endpoint: string;

  // Response details
  status_code?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };

  // Log metadata
  level: LogLevel;
  message: string;

  // Additional accumulated attributes
  [key: string]: unknown;
}

/**
 * Serialize an error into a loggable format
 */
function serializeError(error: Error): {
  name: string;
  message: string;
  stack?: string;
} {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

/**
 * Build a canonical log event from the current request context
 */
function buildCanonicalEvent(
  level: LogLevel,
  message: string,
  ctx: RequestContext,
  additionalData?: Record<string, unknown>,
): CanonicalLogEvent {
  return {
    // Timing
    timestamp: new Date().toISOString(),
    duration_ms: getRequestDuration(),

    // Request identification
    request_id: ctx.requestId,
    trace_id: ctx.traceId,
    span_id: ctx.spanId,

    // User context
    user_id: ctx.userId,
    session_id: ctx.sessionId,

    // Request details
    method: ctx.method,
    endpoint: ctx.endpoint,

    // Log metadata
    level,
    message,

    // Merge accumulated attributes and additional data
    ...ctx.attributes,
    ...additionalData,
  };
}

/**
 * Emit a log event to OpenTelemetry
 */
function emitToOTel(event: CanonicalLogEvent): void {
  const logger = logs.getLogger("insurflow");

  logger.emit({
    severityNumber: severityMap[event.level],
    severityText: event.level.toUpperCase(),
    body: event.message,
    attributes: {
      // Flatten the event into attributes for OTLP
      "request.id": event.request_id,
      "trace.id": event.trace_id,
      "span.id": event.span_id,
      "user.id": event.user_id,
      "session.id": event.session_id,
      "http.method": event.method,
      "http.route": event.endpoint,
      "http.status_code": event.status_code,
      duration_ms: event.duration_ms,
      // Include error details if present
      ...(event.error && {
        "error.name": event.error.name,
        "error.message": event.error.message,
        "error.stack": event.error.stack,
      }),
      // Include all other accumulated attributes
      ...Object.fromEntries(
        Object.entries(event).filter(
          ([key]) =>
            ![
              "timestamp",
              "duration_ms",
              "request_id",
              "trace_id",
              "span_id",
              "user_id",
              "session_id",
              "method",
              "endpoint",
              "status_code",
              "error",
              "level",
              "message",
            ].includes(key),
        ),
      ),
    },
  });
}

/**
 * Emit a log event to console (fallback or development)
 */
function emitToConsole(event: CanonicalLogEvent): void {
  const output = JSON.stringify(event);

  switch (event.level) {
    case "debug":
      console.debug(output);
      break;
    case "info":
      console.info(output);
      break;
    case "warn":
      console.warn(output);
      break;
    case "error":
    case "fatal":
      console.error(output);
      break;
  }
}

/**
 * Check if we should emit to console only
 */
function isConsoleOnly(): boolean {
  // In development without OTLP configured, use console only
  return (
    process.env.NODE_ENV === "development" &&
    !process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  );
}

/**
 * Emit a canonical log event
 *
 * This is the primary logging function. It builds a complete event
 * from the current request context and emits it to the configured
 * destinations (OTLP/Grafana and/or console).
 */
export function emitLog(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>,
): void {
  const ctx = getRequestContext();

  if (!ctx) {
    // No request context - emit a simple log
    const simpleEvent: CanonicalLogEvent = {
      timestamp: new Date().toISOString(),
      duration_ms: 0,
      request_id: "no-context",
      trace_id: "no-trace",
      span_id: "no-span",
      method: "N/A",
      endpoint: "N/A",
      level,
      message,
      ...data,
    };

    emitToConsole(simpleEvent);
    return;
  }

  const event = buildCanonicalEvent(level, message, ctx, data);

  // Always emit to console in development
  if (isConsoleOnly() || process.env.NODE_ENV === "development") {
    emitToConsole(event);
  }

  // Emit to OTLP if configured
  if (!isConsoleOnly()) {
    emitToOTel(event);
  }
}

/**
 * Convenience logging functions
 */
export const log = {
  debug: (message: string, data?: Record<string, unknown>) =>
    emitLog("debug", message, data),

  info: (message: string, data?: Record<string, unknown>) =>
    emitLog("info", message, data),

  warn: (message: string, data?: Record<string, unknown>) =>
    emitLog("warn", message, data),

  error: (message: string, error?: Error, data?: Record<string, unknown>) =>
    emitLog("error", message, {
      ...data,
      ...(error && { error: serializeError(error) }),
    }),

  fatal: (message: string, error?: Error, data?: Record<string, unknown>) =>
    emitLog("fatal", message, {
      ...data,
      ...(error && { error: serializeError(error) }),
    }),
};

/**
 * Emit the final canonical log event for a request
 *
 * This should be called exactly ONCE at the end of request processing.
 * It includes the final status code and any accumulated context.
 */
export function emitRequestLog(
  statusCode: number,
  message: string = "Request completed",
): void {
  const ctx = getRequestContext();
  if (!ctx) {
    console.warn("[Logger] emitRequestLog called without request context");
    return;
  }

  // Determine log level based on status code
  let level: LogLevel = "info";
  if (statusCode >= 500) {
    level = "error";
  } else if (statusCode >= 400) {
    level = "warn";
  }

  emitLog(level, message, { status_code: statusCode });
}

/**
 * Create a child logger with additional context
 * Useful for adding context in specific code paths
 */
export function createChildLogger(additionalContext: Record<string, unknown>) {
  return {
    debug: (message: string, data?: Record<string, unknown>) =>
      emitLog("debug", message, { ...additionalContext, ...data }),

    info: (message: string, data?: Record<string, unknown>) =>
      emitLog("info", message, { ...additionalContext, ...data }),

    warn: (message: string, data?: Record<string, unknown>) =>
      emitLog("warn", message, { ...additionalContext, ...data }),

    error: (message: string, error?: Error, data?: Record<string, unknown>) =>
      emitLog("error", message, {
        ...additionalContext,
        ...data,
        ...(error && { error: serializeError(error) }),
      }),

    fatal: (message: string, error?: Error, data?: Record<string, unknown>) =>
      emitLog("fatal", message, {
        ...additionalContext,
        ...data,
        ...(error && { error: serializeError(error) }),
      }),
  };
}
