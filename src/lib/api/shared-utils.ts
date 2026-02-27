/**
 * @fileoverview Shared utilities for API routes.
 */

import { NextResponse } from "next/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TOKEN_REGEX = /^[a-z0-9]{12}$/;

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
 * Validate UUID format
 */
export function validateUUID(id: string): NextResponse | null {
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }
  return null;
}

/**
 * Validate token format
 */
export function validateToken(token: string): NextResponse | null {
  if (!TOKEN_REGEX.test(token)) {
    return NextResponse.json(
      { error: "Invalid token format" },
      { status: 400 },
    );
  }
  return null;
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
