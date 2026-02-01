import { headers } from "next/headers";

import { createAuth, type Session as ConfigSession } from "./config";

/**
 * Get the current user's session from the request headers.
 *
 * IMPORTANT: We create the auth instance inside this function to ensure
 * the database connection is created at request time. This is required
 * for Cloudflare Workers where connections cannot be created at module
 * initialization time.
 *
 * NOTE: We intentionally do NOT use React's cache() here because it can cause
 * session data to leak between requests in certain edge runtime environments.
 * The Better Auth library handles its own session caching appropriately.
 *
 * @see https://github.com/Vero-Ventures/insurflow/issues/88
 * @see https://opennext.js.org/cloudflare/howtos/db
 */
export const getSession = async () => {
  const auth = createAuth();
  return auth.api.getSession({ headers: await headers() });
};

/** Session type inferred from Better Auth */
export type Session = NonNullable<ConfigSession>;
