import { auth } from ".";
import { headers } from "next/headers";

/**
 * Get the current user's session from the request headers.
 *
 * NOTE: We intentionally do NOT use React's cache() here because it can cause
 * session data to leak between requests in certain edge runtime environments.
 * The Better Auth library handles its own session caching appropriately.
 *
 * @see https://github.com/Vero-Ventures/insurflow/issues/88
 */
export const getSession = async () =>
  auth.api.getSession({ headers: await headers() });

/** Session type inferred from Better Auth */
export type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;
