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
  searchParams: Promise<{ clientId?: string }>;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/sign-up?role=client");
  }

  const { clientId } = await searchParams;

  // clientId must be present and valid UUID
  if (!clientId || !UUID_REGEX.test(clientId)) {
    redirect("/apply/intake");
  }

  // Verify the client row exists, belongs to this user, and is not deleted
  const db = getDb();
  const row = await db.query.client.findFirst({
    columns: { id: true },
    where: and(
      eq(client.id, clientId),
      eq(client.userId, session.user.id),
      isNull(client.deletedAt),
    ),
  });

  if (!row) {
    redirect("/apply/intake");
  }

  return <ReviewForm clientId={row.id} />;
}
