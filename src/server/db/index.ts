import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { cache } from "react";

import { env } from "@/env";
import * as schema from "./schema";

/**
 * Database connection factory for Cloudflare Workers compatibility.
 *
 * Uses @neondatabase/serverless with drizzle-orm/neon-http which is
 * specifically designed for serverless and edge environments like
 * Cloudflare Workers. Uses HTTP requests instead of WebSockets.
 *
 * The neon() function creates a SQL tagged template function that
 * makes HTTP requests to the database.
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
 * @see https://neon.tech/docs/serverless/serverless-driver
 * @see https://orm.drizzle.team/docs/get-started/neon-new
 */
export const getDb = cache((): NeonHttpDatabase<typeof schema> => {
  const sql = neon(env.DATABASE_URL);
  return drizzle(sql, { schema });
});

// Type export for convenience
export type Database = NeonHttpDatabase<typeof schema>;
