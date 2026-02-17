import {
  drizzle as drizzlePostgresJs,
  type PostgresJsDatabase,
} from "drizzle-orm/postgres-js";
import {
  drizzle as drizzleNeonHttp,
  type NeonHttpDatabase,
} from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import postgres from "postgres";
import { cache } from "react";

import * as schema from "./schemas";

type Database =
  | PostgresJsDatabase<typeof schema>
  | NeonHttpDatabase<typeof schema>;

/**
 * Database connection factory with environment-aware driver selection.
 *
 * 1. **Production & Preview (Vercel)**:
 *    Uses Neon serverless driver via HTTP for optimal edge performance.
 *    Neon provides built-in connection pooling.
 *
 * 2. **Local Development**:
 *    Uses `postgres-js` for TCP connections to local Docker Postgres.
 *
 * The `cache()` wrapper ensures we reuse the same client within a single
 * React request context.
 *
 * @see https://neon.tech/docs/guides/vercel
 */
export const getDb = cache((): Database => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  // Production/Preview: Use Neon serverless driver (HTTP-based)
  if (connectionString.includes("neon.tech")) {
    const sql = neon(connectionString);
    return drizzleNeonHttp(sql, { schema });
  }

  // Local development: Use postgres-js for Docker Postgres
  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzlePostgresJs(client, { schema });
});

// Type export for convenience
export type { Database };
