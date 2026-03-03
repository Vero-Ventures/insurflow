import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";

import { AUTHENTICATED_HOME_ROUTE } from "@/lib/app-routes";
import { Card } from "@/components/ui/card";
import { getSession } from "@/server/better-auth/server";
import { getDb } from "@/server/db";
import { client } from "@/server/db/schemas";
import ConsentSubmitForm from "./consent-submit-form";

export async function submitApplicationAction(formData: FormData) {
  "use server";

  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/sign-up?role=client");
  }

  // Server-side consent validation — all three must be explicitly present.
  // This mirrors the client-side sessionStorage check in ConsentSubmitForm.
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

  const now = new Date();
  const db = getDb();

  // Atomically persist consent timestamps to the client record.
  // The WHERE condition ensures timestamps are never overwritten once set.
  // No-op if no matching draft client record exists yet (v1 limitation —
  // client record creation is a future step in the D2C flow).
  await db
    .update(client)
    .set({
      consentTransmitToCarrierAt: now,
      healthInfoAuthorizationAt: now,
      esignIntentAcknowledgedAt: now,
    })
    .where(
      and(
        eq(client.userId, session.user.id),
        isNull(client.deletedAt),
        // Only set timestamps if they have not been recorded yet
        isNull(client.consentTransmitToCarrierAt),
      ),
    );

  redirect(AUTHENTICATED_HOME_ROUTE);
}

export default async function ApplySubmitPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/sign-up?role=client");
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] px-4 py-8 sm:py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <section className="space-y-2">
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">
            Step 4 of 4
          </p>
          <h1 className="font-display text-foreground text-3xl tracking-tight sm:text-4xl">
            Confirm and submit
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Review complete. Confirm below to submit your application.
          </p>
        </section>

        <Card className="border-border/60 bg-card/80 p-6">
          <ConsentSubmitForm action={submitApplicationAction} />
        </Card>
      </div>
    </main>
  );
}
