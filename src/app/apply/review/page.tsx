import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";

import { UUID_REGEX } from "@/lib/validation/client";
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
  searchParams: Promise<{ clientId?: string; estimateRunId?: string }>;
}) {
  const session = await getSession();
  if (!session?.user) {
    return <ReviewForm clientId={null} />;
  }

  const { clientId, estimateRunId } = await searchParams;

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
    redirect("/apply/intake");
  }

  return <ReviewForm clientId={row.id} estimateRunId={estimateRunId} />;
}
