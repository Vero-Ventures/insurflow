import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { env } from "@/env";
import { getDb } from "@/server/db";
import { buildSocialProviders } from "@/server/better-auth/social-providers";

export function getUserOptions(): BetterAuthOptions["user"] {
  return {
    deleteUser: {
      enabled: true,
    },
  };
}

/**
 * Better Auth configuration options factory.
 *
 * Returns the configuration object for Better Auth. The database adapter
 * is created lazily when getDb() is called, ensuring proper initialization
 * in Cloudflare Workers where connections must be created at request time.
 */
function getAuthOptions(): BetterAuthOptions {
  return {
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
    }),
    emailAndPassword: {
      enabled: true,
    },
    user: getUserOptions(),
    socialProviders: buildSocialProviders(env),
  };
}

/**
 * Creates a Better Auth instance with proper request-time initialization.
 *
 * IMPORTANT: In Cloudflare Workers, database connections must be created at
 * request time, not at module initialization. This factory function ensures
 * the database adapter is created when the auth instance is needed.
 *
 * React's cache() in getDb() ensures we reuse the same database connection
 * within a single request context.
 *
 * @see https://opennext.js.org/cloudflare/howtos/db
 */
export function createAuth() {
  return betterAuth(getAuthOptions());
}

/**
 * Auth instance type for inference purposes.
 * Use createAuth() to get an actual instance.
 */
export type Auth = ReturnType<typeof createAuth>;

/**
 * Session type inferred from Better Auth configuration.
 */
export type Session = Auth["$Infer"]["Session"];
