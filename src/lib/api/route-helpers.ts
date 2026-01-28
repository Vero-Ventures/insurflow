import { getSession } from "@/server/better-auth/server";
import { NextResponse } from "next/server";
import type { Logger } from "@/server/axiom";

/**
 * Shared helper for session validation in API routes
 * Returns the session if valid, or an error response if unauthorized
 */
export async function validateSession(logger: Logger) {
  const session = await getSession();

  if (!session?.user) {
    await logger.warn("Unauthorized access attempt");
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { session };
}

/**
 * Shared helper for parsing JSON body with error handling
 * Returns the parsed body or an error response
 */
export async function parseJsonBody<T = unknown>(
  request: Request,
  logger: Logger,
): Promise<{ body: T } | { error: NextResponse }> {
  try {
    const body = await request.json();
    return { body: body as T };
  } catch {
    await logger.warn("Invalid JSON body received");
    return {
      error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
}

/**
 * Shared helper for validation error responses
 */
export async function handleValidationError(
  logger: Logger,
  error: { flatten: () => unknown; format: () => unknown },
  message = "Validation failed",
) {
  await logger.warn(message, {
    validationErrors: error.flatten(),
  });
  return NextResponse.json(
    {
      error: message,
      details: error.format(),
    },
    { status: 400 },
  );
}
