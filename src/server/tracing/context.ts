/**
 * Request Context Management using AsyncLocalStorage
 *
 * This module provides request-scoped context that is automatically
 * propagated through async boundaries. It enables the "One Event Per Request"
 * (Canonical Logging) pattern by accumulating context throughout the request
 * lifecycle.
 *
 * @see https://nodejs.org/api/async_context.html
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { trace, type Span } from "@opentelemetry/api";
import { randomUUID } from "node:crypto";

/**
 * Request context that accumulates throughout the request lifecycle
 */
export interface RequestContext {
  /** Unique identifier for this request */
  requestId: string;

  /** OpenTelemetry trace ID for correlation */
  traceId: string;

  /** OpenTelemetry span ID for correlation */
  spanId: string;

  /** Authenticated user ID (if available) */
  userId?: string;

  /** User's session ID (if available) */
  sessionId?: string;

  /** HTTP method */
  method: string;

  /** Request endpoint/path */
  endpoint: string;

  /** Request start time (for duration calculation) */
  startTime: number;

  /** Accumulated attributes for the canonical log event */
  attributes: Record<string, unknown>;
}

/**
 * AsyncLocalStorage instance for request context
 * This allows context to be accessed anywhere in the async call stack
 * without explicitly passing it through function parameters.
 */
const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current request context
 * Returns undefined if called outside of a request context
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

/**
 * Get the current request context or throw an error
 * Use this when you expect to be within a request context
 */
export function requireRequestContext(): RequestContext {
  const ctx = requestContextStorage.getStore();
  if (!ctx) {
    throw new Error(
      "Request context not found. Ensure this code runs within withRequestContext().",
    );
  }
  return ctx;
}

/**
 * Add attributes to the current request context
 * These attributes will be included in the canonical log event
 */
export function addRequestAttribute(key: string, value: unknown): void {
  const ctx = requestContextStorage.getStore();
  if (ctx) {
    ctx.attributes[key] = value;
  }
}

/**
 * Add multiple attributes to the current request context
 */
export function addRequestAttributes(
  attributes: Record<string, unknown>,
): void {
  const ctx = requestContextStorage.getStore();
  if (ctx) {
    Object.assign(ctx.attributes, attributes);
  }
}

/**
 * Set the user context for the current request
 * Call this after authentication to associate the request with a user
 */
export function setUserContext(userId: string, sessionId?: string): void {
  const ctx = requestContextStorage.getStore();
  if (ctx) {
    ctx.userId = userId;
    if (sessionId) {
      ctx.sessionId = sessionId;
    }
  }
}

/**
 * Get trace context from the current active span
 */
export function getCurrentTraceContext(): {
  traceId: string;
  spanId: string;
} | null {
  const span = trace.getActiveSpan();
  if (!span) return null;

  const spanContext = span.spanContext();
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
  };
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${randomUUID()}`;
}

/**
 * Options for creating a new request context
 */
export interface CreateRequestContextOptions {
  method: string;
  endpoint: string;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  initialAttributes?: Record<string, unknown>;
}

/**
 * Create a new request context
 * This is typically called at the start of request handling
 */
export function createRequestContext(
  options: CreateRequestContextOptions,
): RequestContext {
  const traceCtx = getCurrentTraceContext();

  return {
    requestId: options.requestId ?? generateRequestId(),
    traceId: traceCtx?.traceId ?? "no-trace",
    spanId: traceCtx?.spanId ?? "no-span",
    userId: options.userId,
    sessionId: options.sessionId,
    method: options.method,
    endpoint: options.endpoint,
    startTime: Date.now(),
    attributes: options.initialAttributes ?? {},
  };
}

/**
 * Run a function within a request context
 *
 * This establishes an async context that propagates through all
 * async operations within the callback. The context can be accessed
 * anywhere in the call stack using getRequestContext().
 *
 * @example
 * ```ts
 * await withRequestContext(
 *   { method: "GET", endpoint: "/api/users" },
 *   async () => {
 *     // Context is available here and in any called functions
 *     const ctx = getRequestContext();
 *     addRequestAttribute("userCount", users.length);
 *     return fetchUsers();
 *   }
 * );
 * ```
 */
export function withRequestContext<T>(
  options: CreateRequestContextOptions,
  fn: () => T,
): T {
  const ctx = createRequestContext(options);
  return requestContextStorage.run(ctx, fn);
}

/**
 * Run a function within an existing request context
 * Useful for running nested operations that should share the same context
 */
export function runInContext<T>(ctx: RequestContext, fn: () => T): T {
  return requestContextStorage.run(ctx, fn);
}

/**
 * Calculate the duration of the current request in milliseconds
 */
export function getRequestDuration(): number {
  const ctx = requestContextStorage.getStore();
  if (!ctx) return 0;
  return Date.now() - ctx.startTime;
}

/**
 * Update trace IDs in the current context
 * Called when a new span is created to keep trace correlation current
 */
export function updateTraceContext(span: Span): void {
  const ctx = requestContextStorage.getStore();
  if (ctx) {
    const spanContext = span.spanContext();
    ctx.traceId = spanContext.traceId;
    ctx.spanId = spanContext.spanId;
  }
}
