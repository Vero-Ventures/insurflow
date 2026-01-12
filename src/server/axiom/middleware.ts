import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createLogger } from "@/server/axiom";

/**
 * Generate a unique request ID using cryptographically secure random values
 */
function generateRequestId(): string {
  return `req_${randomUUID()}`;
}

/**
 * Axiom logging middleware
 * Implements "One Event Per Request" pattern - accumulates context throughout request lifecycle
 * and emits a single wide event when the request completes
 */
export async function axiomMiddleware(
  request: NextRequest,
): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = generateRequestId();

  // Initialize logger with request context
  const logger = createLogger({
    requestId,
    method: request.method,
    endpoint: request.nextUrl.pathname,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  // Get response (let other middleware and handlers run)
  const response = NextResponse.next();

  // Add request ID to response headers for tracing
  response.headers.set("x-request-id", requestId);

  // Note: In Next.js middleware, we cannot await the actual request processing to complete
  // The response object here is the immediate middleware response, not the final handler response
  // Duration represents middleware processing time only, not full request handling time
  // For accurate end-to-end duration and status tracking, use instrumentation or route handlers with logging
  const duration = Date.now() - startTime;

  // Emit single log event with available context
  // Note: statusCode reflects middleware response, not final handler response
  await logger.info("Request passed through middleware", {
    statusCode: response.status,
    duration,
  });

  // Flush logs
  await logger.flush();

  return response;
}
