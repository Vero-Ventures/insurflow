import {
  drizzle as drizzleNodePg,
  type NodePgDatabase,
} from "drizzle-orm/node-postgres";
import {
  drizzle as drizzlePostgresJs,
  type PostgresJsDatabase,
} from "drizzle-orm/postgres-js";
import {
  drizzle as drizzleNeonHttp,
  type NeonHttpDatabase,
} from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { Client } from "pg";
import postgres from "postgres";
import { cache } from "react";

import type { CloudflareEnv } from "@/../worker-configuration.d";
import * as schema from "./schema";

type Database =
  | NodePgDatabase<typeof schema>
  | PostgresJsDatabase<typeof schema>
  | NeonHttpDatabase<typeof schema>;

/**
 * Database connection factory with environment-aware driver selection.
 *
 * This follows best practices from OpenNext, Neon, and Cloudflare documentation:
 *
 * 1. **Production (Cloudflare Workers with Hyperdrive)**:
 *    Uses `pg` Client with Hyperdrive's connection string from `getCloudflareContext()`.
 *    Hyperdrive provides edge connection pooling for lowest latency.
 *
 * 2. **Preview Deployments (Cloudflare Workers without Hyperdrive)**:
 *    Uses Neon serverless driver via HTTP for direct database access.
 *    Each PR preview gets its own Neon branch via DATABASE_URL env var.
 *
 * 3. **Local Development**:
 *    Uses `postgres-js` for TCP connections to local Docker Postgres.
 *
 * IMPORTANT: Per OpenNext docs, database clients must be created at request time,
 * not at module initialization time. The `cache()` wrapper ensures we reuse the
 * same client within a single React request context.
 *
 * @see https://opennext.js.org/cloudflare/howtos/db
 * @see https://neon.tech/docs/guides/cloudflare-workers
 * @see https://developers.cloudflare.com/hyperdrive/
 */
export const getDb = cache((): Database => {
  // Get DATABASE_URL first - it's used for local dev and preview deployments
  const connectionString = process.env.DATABASE_URL;

  // Try to get Hyperdrive binding from Cloudflare context (production only)
  // Skip this in development to avoid issues with placeholder Hyperdrive IDs
  if (process.env.NODE_ENV === "production") {
    try {
      // Dynamic import to avoid issues during build/SSG
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getCloudflareContext } = require("@opennextjs/cloudflare");
      const context = getCloudflareContext() as
        | { env?: CloudflareEnv }
        | undefined;

      const hyperdriveConnectionString =
        context?.env?.HYPERDRIVE?.connectionString;
      if (hyperdriveConnectionString) {
        // Production: Use Hyperdrive (edge connection pooling)
        const client = new Client({
          connectionString: hyperdriveConnectionString,
        });
        // Note: Client.connect() is called automatically by drizzle on first query
        return drizzleNodePg({ client, schema });
      }
    } catch {
      // Not in Cloudflare Workers context or Hyperdrive not configured
      // Fall through to DATABASE_URL-based methods
    }
  }

  // Require DATABASE_URL for non-Hyperdrive environments
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is required when Hyperdrive is not available",
    );
  }

  // Preview deployments: Use Neon serverless driver (HTTP-based)
  // This handles Neon branch URLs for PR previews
  if (connectionString.includes("neon.tech")) {
    const sql = neon(connectionString);
    return drizzleNeonHttp(sql, { schema });
  }

  // Local development: Use postgres-js for Docker Postgres
  const client = postgres(connectionString);
  return drizzlePostgresJs(client, { schema });
});

// Type export for convenience
export type { Database };
