import { and, eq, ne } from "drizzle-orm";

import { getDb } from "@/server/db";
import { userProfile } from "@/server/db/schemas";

/**
 * Canonicalize D2C users to client account type.
 *
 * This app is now D2C-only, so advisor roles should not block
 * draft creation/review flows.
 */
export async function ensureD2cClientAccountType(
  userId: string,
): Promise<void> {
  const db = getDb() as {
    update?: typeof getDb extends (...args: never[]) => infer T
      ? T extends { update: infer U }
        ? U
        : never
      : never;
  };

  // Some unit tests mock DB with query-only shape; skip normalization there.
  if (typeof db.update !== "function") {
    return;
  }

  try {
    await db
      .update(userProfile)
      .set({ accountType: "client", updatedAt: new Date() })
      .where(
        and(
          eq(userProfile.userId, userId),
          ne(userProfile.accountType, "client"),
        ),
      );
  } catch {
    // Best-effort normalization: do not block draft/review flows.
  }
}
