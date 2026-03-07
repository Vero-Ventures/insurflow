"use server";

import { redirect } from "next/navigation";
import { and, eq, isNull, sql } from "drizzle-orm";

import { AUTHENTICATED_HOME_ROUTE } from "@/lib/app-routes";
import { UUID_REGEX } from "@/lib/validation/client";
import { invalidateClientResumeLinks } from "@/lib/api/d2c-resume-link-helpers";
import { submitToProvider } from "@/lib/submission/submit-application";
import { getSession } from "@/server/better-auth/server";
import { getDb } from "@/server/db";
import { client } from "@/server/db/schemas";
import { getCarrierProvider } from "@/server/providers/get-carrier-provider";

export async function submitApplicationAction(formData: FormData) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/sign-up?role=client");
  }

  // Server-side consent validation — all three must be explicitly present.
  const consentTransmit = formData.get("consentTransmit") === "true";
  const healthInfoAuth = formData.get("healthInfoAuth") === "true";
  const esignIntent = formData.get("esignIntent") === "true";
  const consentConfirmed = formData.get("consentConfirmed") === "true";

  if (
    !consentTransmit ||
    !healthInfoAuth ||
    !esignIntent ||
    !consentConfirmed
  ) {
    // Consent incomplete — send user back to the review step
    redirect("/apply/review");
  }

  // Validate the target client ID — must be a valid UUID for this submission.
  const clientId = formData.get("clientId");
  if (typeof clientId !== "string" || !UUID_REGEX.test(clientId)) {
    redirect("/apply/review");
  }

  const db = getDb();
  const dbNow = sql`now()`;

  // Persist consent timestamps using COALESCE so each field is only written
  // once — if the column already has a value it is preserved unchanged.
  // Transition the client from "draft" to "active" on successful submission.
  // .returning() lets us detect whether a matching client row was found;
  // if 0 rows are updated, the user is sent back to the review step.
  const updated = await db
    .update(client)
    .set({
      status: "active",
      consentTransmitToCarrierAt: sql`COALESCE(${client.consentTransmitToCarrierAt}, ${dbNow})`,
      healthInfoAuthorizationAt: sql`COALESCE(${client.healthInfoAuthorizationAt}, ${dbNow})`,
      esignIntentAcknowledgedAt: sql`COALESCE(${client.esignIntentAcknowledgedAt}, ${dbNow})`,
    })
    .where(
      and(
        eq(client.id, clientId),
        eq(client.userId, session.user.id),
        eq(client.status, "draft"),
        isNull(client.deletedAt),
      ),
    )
    .returning();

  // If the client row was already activated (repeat submission), allow the
  // provider submission to proceed idempotently below. Only redirect back
  // if the client genuinely doesn't exist or is inaccessible.
  const clientRecord = updated[0];
  if (!clientRecord) {
    // Check if already activated (idempotent repeat click)
    const existingActive = await db.query.client.findFirst({
      where: and(
        eq(client.id, clientId),
        eq(client.userId, session.user.id),
        eq(client.status, "active"),
        isNull(client.deletedAt),
      ),
      columns: { id: true, firstName: true, lastName: true },
    });

    if (!existingActive) {
      // No client row found — submission cannot be recorded.
      redirect("/apply/review");
    }

    // Already active — proceed to provider submission (idempotent)
    await submitToProviderSafely(
      clientId,
      session.user.id,
      existingActive.firstName,
      existingActive.lastName,
      db,
    );
    redirect(AUTHENTICATED_HOME_ROUTE);
  }

  // Invalidate any active resume links for this draft (now that it's active).
  // Best-effort: don't block submission if this fails.
  try {
    await invalidateClientResumeLinks(clientId);
  } catch {
    // Silently continue — link invalidation is best-effort
  }

  // Submit to carrier provider (idempotent — safe on retries/refreshes)
  await submitToProviderSafely(
    clientId,
    session.user.id,
    clientRecord.firstName,
    clientRecord.lastName,
    db,
  );

  redirect(AUTHENTICATED_HOME_ROUTE);
}

/**
 * Wrapper that calls submitToProvider and handles errors gracefully.
 * Provider submission is best-effort: if it fails, the client status is still
 * "active" and the user can track status from their dashboard. The failure is
 * audit-logged inside submitToProvider.
 *
 * Does not throw — all errors are caught and logged internally.
 */
async function submitToProviderSafely(
  clientId: string,
  userId: string,
  firstName: string,
  lastName: string,
  db: ReturnType<typeof getDb>,
): Promise<void> {
  try {
    const provider = getCarrierProvider();
    await submitToProvider(
      { clientId, userId, applicant: { firstName, lastName } },
      provider,
      db,
    );
  } catch (error) {
    // Best-effort: provider submission failure is audit-logged internally.
    // Don't block the user from reaching their dashboard.
    console.error(
      "[submitApplicationAction] Provider submission failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}
