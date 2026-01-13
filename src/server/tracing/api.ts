/**
 * API Route Tracing Wrapper
 *
 * This module provides higher-order functions for wrapping Next.js API routes
 * with automatic tracing and logging. It implements the "One Event Per Request"
 * pattern by:
 *
 * 1. Creating an OpenTelemetry span for the request
 * 2. Establishing a request context with AsyncLocalStorage
 * 3. Optionally extracting user context from the session
 * 4. Emitting a single canonical log event when the request completes
 *
 * @example
 * ```ts
 * // src/app/api/users/route.ts
 * import { withTracing } from "@/server/tracing";
 *
 * export const GET = withTracing(async (request, ctx) => {
 *   ctx.addAttribute("userCount", 10);
 *   return Response.json({ users: [] });
 * });
 * ```
 */

import { type NextRequest, NextResponse } from "next/server";
import { trace, SpanStatusCode, type Span } from "@opentelemetry/api";
import {
  withRequestContext,
  addRequestAttributes,
  updateTraceContext,
  type RequestContext,
} from "./context";
import { emitRequestLog, log } from "./logger";
import { setUserContextFromSession } from "./auth";

/**
 * Get the OpenTelemetry tracer for API routes
 */
const tracer = trace.getTracer("insurflow-api");

/**
 * Extended context passed to route handlers
 */
export interface TracingContext {
  /** The request context */
  request: RequestContext;

  /** Add an attribute to the canonical log event */
  addAttribute: (key: string, value: unknown) => void;

  /** Add multiple attributes to the canonical log event */
  addAttributes: (attributes: Record<string, unknown>) => void;

  /** The OpenTelemetry span for this request */
  span: Span;
}

/**
 * Type for API route handlers
 */
export type TracedRouteHandler = (
  request: NextRequest,
  ctx: TracingContext,
) => Promise<Response>;

/**
 * Options for the tracing wrapper
 */
export interface TracingOptions {
  /**
   * Whether to extract user context from the session
   * @default true
   */
  extractUser?: boolean;

  /**
   * Custom span name (defaults to "HTTP {method} {path}")
   */
  spanName?: string;
}

/**
 * Extract status code from a Response object
 */
function getStatusCode(response: Response): number {
  return response.status;
}

/**
 * Wrap an API route handler with tracing and logging
 *
 * This is the primary function for adding observability to API routes.
 * It automatically:
 * - Creates an OpenTelemetry span
 * - Establishes request context
 * - Extracts user info from session (optional)
 * - Emits a canonical log event on completion
 *
 * @example
 * ```ts
 * export const GET = withTracing(async (request, ctx) => {
 *   const users = await db.users.findMany();
 *   ctx.addAttribute("userCount", users.length);
 *   return Response.json(users);
 * });
 * ```
 */
export function withTracing(
  handler: TracedRouteHandler,
  options: TracingOptions = {},
): (request: NextRequest) => Promise<Response> {
  const { extractUser = true } = options;

  return async (request: NextRequest): Promise<Response> => {
    const method = request.method;
    const pathname = request.nextUrl.pathname;
    const spanName = options.spanName ?? `HTTP ${method} ${pathname}`;

    // Start the OpenTelemetry span
    return tracer.startActiveSpan(spanName, async (span) => {
      // Run within request context - error handling must be inside to preserve context
      return withRequestContext(
        {
          method,
          endpoint: pathname,
          initialAttributes: {
            "http.url": request.url,
            "http.user_agent": request.headers.get("user-agent"),
          },
        },
        async () => {
          try {
            // Update trace context with the new span
            updateTraceContext(span);

            // Extract user context if enabled
            if (extractUser) {
              try {
                await setUserContextFromSession();
              } catch (error) {
                // Log but don't fail the request if user extraction fails
                log.warn("Failed to extract user context", {
                  error: error instanceof Error ? error.message : "Unknown",
                });
              }
            }

            // Create the tracing context for the handler
            const ctx: TracingContext = {
              request: {
                requestId: "",
                traceId: span.spanContext().traceId,
                spanId: span.spanContext().spanId,
                method,
                endpoint: pathname,
                startTime: Date.now(),
                attributes: {},
              },
              addAttribute: (key, value) => {
                addRequestAttributes({ [key]: value });
                span.setAttribute(key, String(value));
              },
              addAttributes: (attributes) => {
                addRequestAttributes(attributes);
                Object.entries(attributes).forEach(([key, value]) => {
                  span.setAttribute(key, String(value));
                });
              },
              span,
            };

            // Execute the handler
            const response = await handler(request, ctx);
            const statusCode = getStatusCode(response);

            // Set span attributes
            span.setAttribute("http.status_code", statusCode);
            span.setAttribute(
              "http.response_content_length",
              response.headers.get("content-length") ?? 0,
            );

            // Set span status based on response
            if (statusCode >= 500) {
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: `HTTP ${statusCode}`,
              });
            } else {
              span.setStatus({ code: SpanStatusCode.OK });
            }

            // Emit the canonical log event
            emitRequestLog(statusCode);

            return response;
          } catch (error) {
            // Handle errors - we're still inside the request context here
            const err =
              error instanceof Error ? error : new Error(String(error));

            span.recordException(err);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: err.message,
            });
            span.setAttribute("http.status_code", 500);

            // Add error to request attributes
            addRequestAttributes({
              "error.name": err.name,
              "error.message": err.message,
              "error.stack": err.stack,
            });

            // Emit error log - context is available here
            emitRequestLog(500, `Request failed: ${err.message}`);

            // Re-throw to let Next.js handle the error
            throw error;
          } finally {
            // Always end the span
            span.end();
          }
        },
      );
    });
  };
}

/**
 * Wrap an API route handler without user extraction
 *
 * Use this for public endpoints that don't require authentication
 * or when you want to manually handle user context.
 */
export function withTracingPublic(
  handler: TracedRouteHandler,
  options: Omit<TracingOptions, "extractUser"> = {},
): (request: NextRequest) => Promise<Response> {
  return withTracing(handler, { ...options, extractUser: false });
}

/**
 * Create a simple traced response
 *
 * Helper for creating JSON responses with automatic status code tracking
 */
export function tracedJson<T>(data: T, init?: ResponseInit): Response {
  const response = NextResponse.json(data, init);
  return response;
}

/**
 * Create an error response with proper logging
 */
export function tracedError(
  message: string,
  statusCode: number = 500,
  error?: Error,
): Response {
  if (error) {
    addRequestAttributes({
      "error.name": error.name,
      "error.message": error.message,
      "error.stack": error.stack,
    });
  }

  return NextResponse.json({ error: message }, { status: statusCode });
}
