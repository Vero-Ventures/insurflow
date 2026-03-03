"use server";

import { redirect } from "next/navigation";
import { and, eq, isNull, sql } from "drizzle-orm";

import { AUTHENTICATED_HOME_ROUTE } from "@/lib/app-routes";
import { UUID_REGEX } from "@/lib/validation/client";
import { getSession } from "@/server/better-auth/server";
import { getDb } from "@/server/db";
import { client } from "@/server/db/schemas";

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

  const now = new Date();
  const db = getDb();

  // Persist consent timestamps using COALESCE so each field is only written
  // once — if the column already has a value it is preserved unchanged.
  // .returning() lets us detect whether a matching client row was found;
  // if 0 rows are updated, the user is sent back to the review step.
  const updated = await db
    .update(client)
    .set({
      consentTransmitToCarrierAt: sql`COALESCE(${client.consentTransmitToCarrierAt}, ${now})`,
      healthInfoAuthorizationAt: sql`COALESCE(${client.healthInfoAuthorizationAt}, ${now})`,
      esignIntentAcknowledgedAt: sql`COALESCE(${client.esignIntentAcknowledgedAt}, ${now})`,
    })
    .where(
      and(
        eq(client.id, clientId),
        eq(client.userId, session.user.id),
        isNull(client.deletedAt),
      ),
    )
    .returning();

  if (updated.length === 0) {
    // No client row found — submission cannot be recorded.
    redirect("/apply/review");
  }

  redirect(AUTHENTICATED_HOME_ROUTE);
}
