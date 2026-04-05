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
  const routeLogger = createManualRouteLogger(
    request,
    "/api/auth/[...all]",
    "GET",
  );
  await routeLogger.logger.info("API request received", {
    requestMethod: routeLogger.context.requestMethod,
    requestUrl: routeLogger.context.requestUrl,
  });

  const auth = createAuth();
  const handler = toNextJsHandler(auth.handler);

  try {
    return await routeLogger.complete(await handler.GET(request));
  } catch (error) {
    await routeLogger.logger.error(
      "Error in GET /api/auth/[...all]",
      error instanceof Error ? error : new Error(String(error)),
    );
    return routeLogger.complete(
      NextResponse.json({ error: "Internal server error" }, { status: 500 }),
    );
  }
};

export const POST = async (request: Request) => {
  const routeLogger = createManualRouteLogger(
    request,
    "/api/auth/[...all]",
    "POST",
  );
  await routeLogger.logger.info("API request received", {
    requestMethod: routeLogger.context.requestMethod,
    requestUrl: routeLogger.context.requestUrl,
  });

  const auth = createAuth();
  const handler = toNextJsHandler(auth.handler);

  try {
    return await routeLogger.complete(await handler.POST(request));
  } catch (error) {
    await routeLogger.logger.error(
      "Error in POST /api/auth/[...all]",
      error instanceof Error ? error : new Error(String(error)),
    );
    return routeLogger.complete(
      NextResponse.json({ error: "Internal server error" }, { status: 500 }),
    );
  }
};
