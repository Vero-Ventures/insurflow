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
