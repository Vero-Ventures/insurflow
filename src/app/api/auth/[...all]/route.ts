import { toNextJsHandler } from "better-auth/next-js";

import { createAuth } from "@/server/better-auth";

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
export const GET = (request: Request) => {
  const auth = createAuth();
  const handler = toNextJsHandler(auth.handler);
  return handler.GET(request);
};

export const POST = (request: Request) => {
  const auth = createAuth();
  const handler = toNextJsHandler(auth.handler);
  return handler.POST(request);
};
