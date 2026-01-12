import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createLogger } from "@/server/axiom";

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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

  // Calculate duration
  const duration = Date.now() - startTime;

  // Emit single log event with complete context
  await logger.info("Request completed", {
    statusCode: response.status,
    duration,
  });

  // Flush logs
  await logger.flush();

  // Add request ID to response headers for tracing
  response.headers.set("x-request-id", requestId);

  return response;
}
