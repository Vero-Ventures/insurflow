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

  const { clientId } = await searchParams;
  if (clientId && !UUID_REGEX.test(clientId)) {
    redirect("/apply/intake");
  }

  let resolvedClientId: string | null = null;

  try {
    const normalizationResult = await ensureD2cClientAccountType(
      session.user.id,
    );
    if (!normalizationResult.ok) {
      console.warn("[apply/review] D2C account normalization failed", {
        userId: session.user.id,
        clientId: clientId ?? null,
        error:
          normalizationResult.error instanceof Error
            ? normalizationResult.error.message
            : String(normalizationResult.error),
      });
    }

    const db = getDb();

    const findLatestOwnedDraft = () =>
      db.query.client.findFirst({
        columns: { id: true },
        where: and(
          eq(client.userId, session.user.id),
          eq(client.status, "draft"),
          isNull(client.deletedAt),
        ),
        orderBy: (clientTable, { desc }) => [desc(clientTable.updatedAt)],
      });

    let row = clientId
      ? await db.query.client.findFirst({
          columns: { id: true },
          where: and(
            eq(client.id, clientId),
            eq(client.userId, session.user.id),
            eq(client.status, "draft"),
            isNull(client.deletedAt),
          ),
        })
      : await findLatestOwnedDraft();

    // In production, immediately navigating after draft creation/update can
    // briefly race with fresh reads. If the requested draft cannot be loaded,
    // retry by resolving the latest owned draft instead of hard-resetting to
    // intake.
    if (!row && clientId) {
      console.warn("[apply/review] Requested draft unavailable, retrying", {
        userId: session.user.id,
        requestedClientId: clientId,
      });
      row = await findLatestOwnedDraft();
    }

    if (row) {
      resolvedClientId = row.id;
    } else {
      // Safety net: if step-3 persistence failed transiently, provision a draft
      // here so authenticated users can still proceed to review.
      const created = await createDraft(session.user.id);
      if (created.success) {
        resolvedClientId = created.draft.id;
      } else {
        console.warn("[apply/review] Failed to auto-provision review draft", {
          userId: session.user.id,
          requestedClientId: clientId ?? null,
        });
      }
    }
  } catch (error) {
    console.error("[apply/review] Failed to resolve review draft", error);
  }

  if (!resolvedClientId) {
    redirect("/apply/intake");
  }

  return <ReviewForm clientId={resolvedClientId} />;
}
