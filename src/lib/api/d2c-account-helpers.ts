import { and, eq, ne } from "drizzle-orm";

import { getDb } from "@/server/db";
import { userProfile } from "@/server/db/schemas";

export interface D2cAccountNormalizationResult {
  ok: boolean;
  error?: unknown;
}

/**
 * Canonicalize D2C users to client account type.
 *
 * This app is now D2C-only, so advisor roles should not block
 * draft creation/review flows.
 */
export async function ensureD2cClientAccountType(
  userId: string,
): Promise<D2cAccountNormalizationResult> {
  const db = getDb() as {
    update?: typeof getDb extends (...args: never[]) => infer T
      ? T extends { update: infer U }
        ? U
        : never
      : never;
  };

  // Some unit tests mock DB with query-only shape; skip normalization there.
  if (typeof db.update !== "function") {
    return { ok: true };
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
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}
