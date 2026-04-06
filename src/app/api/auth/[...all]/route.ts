import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";

import { createAuth } from "@/server/better-auth";
import { createManualRouteLogger } from "@/server/observability/route-logger";

/**
 * Better Auth API route handlers.
 *
 * IMPORTANT: We create the auth instance inside each handler to ensure
 * the database connection is created at request time. This is required
 * for Cloudflare Workers where connections cannot be created at module
 * initialization time.
 *
 * @see https://opennext.js.org/cloudflare/howtos/db
 */
export const GET = async (request: Request) => {
  return handleAuthRequest(request, "GET", async (handler) =>
    handler.GET(request),
  );
};

export const POST = async (request: Request) => {
  return handleAuthRequest(request, "POST", async (handler) =>
    handler.POST(request),
  );
};

async function handleAuthRequest(
  request: Request,
  method: "GET" | "POST",
  runHandler: (
    handler: ReturnType<typeof toNextJsHandler>,
  ) => Promise<Response>,
) {
  const routeLogger = createManualRouteLogger(
    request,
    "/api/auth/[...all]",
    method,
  );

  try {
    await routeLogger.logger.info("API request received", {
      requestMethod: routeLogger.context.requestMethod,
      requestUrl: routeLogger.context.requestUrl,
    });

    const auth = createAuth();
    const handler = toNextJsHandler(auth.handler);

    return routeLogger.complete(await runHandler(handler));
  } catch (error) {
    try {
      await routeLogger.logger.error(
        `Error in ${method} /api/auth/[...all]`,
        error instanceof Error ? error : new Error(String(error)),
      );
    } catch (loggingError) {
      console.error(
        "[auth route] Failed to log auth route error",
        loggingError,
      );
    }

    const fallbackResponse = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
    fallbackResponse.headers.set("x-request-id", routeLogger.context.requestId);
    return fallbackResponse;
  }
}
