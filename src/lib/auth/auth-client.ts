import { createAuthClient } from "better-auth/react";

/**
 * Browser-safe Better Auth client.
 *
 * This module is safe to import from Client Components.
 */
export const authClient = createAuthClient();

export type Session = typeof authClient.$Infer.Session;
