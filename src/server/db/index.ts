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
 * @see https://opennext.js.org/cloudflare/howtos/db
 */
export const getDb = cache((): PostgresJsDatabase<typeof schema> => {
  const client = postgres(env.DATABASE_URL, {
    max: 1,
    idle_timeout: 0,
    connect_timeout: 10,
  });

  return drizzle(client, { schema });
});

/**
 * Legacy export for backwards compatibility.
 *
 * WARNING: This creates a connection at module load time, which works in
 * development but may cause issues in Cloudflare Workers for some use cases.
 * Prefer using getDb() for new code.
 *
 * @deprecated Use getDb() instead for Cloudflare Workers compatibility
 */
export const db = getDb();
