import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";

import { UUID_REGEX } from "@/lib/validation/client";
import { createDraft } from "@/lib/api/d2c-draft-helpers";
import { ensureD2cClientAccountType } from "@/lib/api/d2c-account-helpers";
import { getSession } from "@/server/better-auth/server";
import { getDb } from "@/server/db";
import { client } from "@/server/db/schemas";
import ReviewForm from "./review-form";

/**
 * Server Component that validates the `clientId` search-param before rendering
 * the interactive consent form.
 *
 * Validation performed:
 *  1. `clientId` must be a valid UUID (format check).
 *  2. The authenticated user must own the client row.
 *  3. The client row must not be soft-deleted.
 *
 * If any check fails the user is redirected to `/apply/intake`.
 */
export default async function ApplyReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const session = await getSession();
  if (!session?.user) {
    return <ReviewForm clientId={null} />;
  }

  let resolvedClientId: string | null = null;

  try {
    await ensureD2cClientAccountType(session.user.id);

    const { clientId } = await searchParams;

    const db = getDb();
    const row = clientId
      ? await (async () => {
          if (!UUID_REGEX.test(clientId)) {
            redirect("/apply/intake");
          }

          return db.query.client.findFirst({
            columns: { id: true },
            where: and(
              eq(client.id, clientId),
              eq(client.userId, session.user.id),
              eq(client.status, "draft"),
              isNull(client.deletedAt),
            ),
          });
        })()
      : await db.query.client.findFirst({
          columns: { id: true },
          where: and(
            eq(client.userId, session.user.id),
            eq(client.status, "draft"),
            isNull(client.deletedAt),
          ),
          orderBy: (clientTable, { desc }) => [desc(clientTable.updatedAt)],
        });

    if (!row) {
      // Safety net: if step-3 persistence failed transiently, provision a draft
      // here so authenticated users can still proceed to review.
      if (!clientId) {
        const created = await createDraft(session.user.id);
        if (created.success) {
          resolvedClientId = created.draft.id;
        }
      }

      if (!resolvedClientId) {
        redirect("/apply/intake");
      }
    }

    if (row) {
      resolvedClientId = row.id;
    }
  } catch (error) {
    console.error("[apply/review] Failed to resolve review draft", error);
    redirect("/apply/intake");
  }

  return <ReviewForm clientId={resolvedClientId} />;
}
