import {
  drizzle as drizzleNeon,
  type NeonHttpDatabase,
} from "drizzle-orm/neon-http";
import {
  drizzle as drizzlePostgres,
  type PostgresJsDatabase,
} from "drizzle-orm/postgres-js";
import { neon } from "@neondatabase/serverless";
import postgres from "postgres";
import { cache } from "react";

import { env } from "@/env";
import * as schema from "./schema";

/**
 * Database connection factory with environment-aware driver selection.
 *
 * - **Production (Cloudflare Workers)**: Uses @neondatabase/serverless with HTTP
 *   for edge compatibility
 * - **Local Development**: Uses postgres-js with TCP connections for Docker Postgres
 *
 * The driver is selected based on DATABASE_URL:
 * - URLs containing "neon.tech" use the Neon HTTP driver
 * - All other URLs use the standard postgres-js driver
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
 */

type Database =
  | NeonHttpDatabase<typeof schema>
  | PostgresJsDatabase<typeof schema>;

const isNeonUrl = env.DATABASE_URL.includes("neon.tech");

export const getDb = cache((): Database => {
  if (isNeonUrl) {
    // Production: Use Neon serverless HTTP driver for Cloudflare Workers
    const sql = neon(env.DATABASE_URL);
    return drizzleNeon(sql, { schema });
  } else {
    // Local development: Use postgres-js with TCP connection
    const client = postgres(env.DATABASE_URL);
    return drizzlePostgres(client, { schema });
  }
});

// Type export for convenience
export type { Database };
