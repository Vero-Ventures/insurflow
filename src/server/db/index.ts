import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { cache } from "react";

import { env } from "@/env";
import * as schema from "./schema";

/**
 * Database connection factory for Cloudflare Workers compatibility.
 *
 * Cloudflare Workers cannot reuse database connections across requests.
 * This factory creates a new connection per request, using React's cache()
 * to memoize within a single request lifecycle.
 *
 * Key settings for Workers:
 * - max: 1 - Single connection per request (no pooling across requests)
 * - idle_timeout: 0 - Don't keep connections alive after request
 * - connect_timeout: 10 - Reasonable timeout for cold starts
 *
 * Usage: Call getDb() inside your request handler, NOT at module scope.
 *
 * @example
 * ```ts
 * export async function GET() {
 *   const db = getDb();
 *   const users = await db.query.user.findMany();
 *   return NextResponse.json(users);
 * }
 * ```
 *
 * @see https://opennext.js.org/cloudflare/howtos/db
 * @see https://github.com/Vero-Ventures/insurflow/issues/90
 */
export const getDb = cache((): PostgresJsDatabase<typeof schema> => {
  const isEdgeRuntime = process.env.NEXT_RUNTIME === "edge";
  const client = postgres(env.DATABASE_URL, {
    max: isEdgeRuntime ? 1 : 5,
    idle_timeout: isEdgeRuntime ? 0 : 20,
    connect_timeout: 10,
  });

  return drizzle(client, { schema });
});
