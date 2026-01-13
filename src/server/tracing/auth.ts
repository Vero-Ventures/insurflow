/**
 * Auth Context Helper for Tracing
 *
 * This module extracts user context from Better Auth sessions
 * and integrates it into the request context for logging.
 */

import { headers } from "next/headers";
import { auth } from "@/server/better-auth/config";
import { setUserContext, addRequestAttributes } from "./context";

/**
 * User info extracted from the session
 */
export interface UserInfo {
  userId: string;
  sessionId: string;
  email?: string;
  name?: string;
}

/**
 * Extract user info from the current Better Auth session
 * Returns null if no authenticated session exists
 */
export async function getUserFromSession(): Promise<UserInfo | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return null;
    }

    return {
      userId: session.user.id,
      sessionId: session.session.id,
      email: session.user.email,
      name: session.user.name ?? undefined,
    };
  } catch {
    // Session retrieval failed - user is not authenticated
    return null;
  }
}

/**
 * Set user context in the current request from the session
 *
 * Call this early in request handling to associate the request
 * with the authenticated user. The user info will be included
 * in the canonical log event.
 *
 * @returns The user info if authenticated, null otherwise
 */
export async function setUserContextFromSession(): Promise<UserInfo | null> {
  const userInfo = await getUserFromSession();

  if (userInfo) {
    // Set core user identifiers
    setUserContext(userInfo.userId, userInfo.sessionId);

    // Add additional user attributes for logging
    addRequestAttributes({
      "user.email": userInfo.email,
      "user.name": userInfo.name,
    });
  }

  return userInfo;
}

/**
 * Check if the current request is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const userInfo = await getUserFromSession();
  return userInfo !== null;
}
