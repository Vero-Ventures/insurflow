/**
 * @fileoverview Shared utilities for API routes.
 */

import { NextResponse } from "next/server";

/**
 * Extract client IP address from request headers
 */
export async function getClientIp(request: Request): Promise<string | null> {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]!.trim();
  }
  return request.headers.get("x-real-ip") || null;
}

/**
 * Extract base URL from request
 */
export function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

/**
 * Standard error response helper
 */
export function createErrorResponse(
  error: string,
  status: number,
): NextResponse {
  return NextResponse.json({ error }, { status });
}

/**
 * Standard success response helper
 */
export function createSuccessResponse(
  data: unknown,
  status = 200,
): NextResponse {
  return NextResponse.json(data, { status });
}
