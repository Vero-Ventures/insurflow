export function getSessionUserId(
  session:
    | {
        user?: { id?: string | null } | null;
        session?: { userId?: string | null } | null;
      }
    | null
    | undefined,
): string | null {
  const directUserId = session?.user?.id;
  if (typeof directUserId === "string" && directUserId.length > 0) {
    return directUserId;
  }

  const fallbackUserId = session?.session?.userId;
  if (typeof fallbackUserId === "string" && fallbackUserId.length > 0) {
    return fallbackUserId;
  }

  return null;
}

export function normalizeSessionUserId<
  T extends {
    user?: Record<string, unknown> | null;
    session?: { userId?: string | null } | null;
  },
>(session: T): T {
  const userId = getSessionUserId(session);
  if (!userId) {
    return session;
  }

  if (session.user?.id === userId) {
    return session;
  }

  return {
    ...session,
    user: {
      ...(session.user ?? {}),
      id: userId,
    },
  };
}
