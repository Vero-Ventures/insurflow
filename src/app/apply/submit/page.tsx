import { redirect } from "next/navigation";
import { and, eq, isNull, sql } from "drizzle-orm";

import { AUTHENTICATED_HOME_ROUTE } from "@/lib/app-routes";
import { Card } from "@/components/ui/card";
import { getSession } from "@/server/better-auth/server";
import { getDb } from "@/server/db";
import { client } from "@/server/db/schemas";

export async function submitApplicationAction(formData: FormData) {
  "use server";

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
    .where(and(eq(client.userId, session.user.id), isNull(client.deletedAt)))
    .returning();

  if (updated.length === 0) {
    // No client row found — submission cannot be recorded.
    redirect("/apply/review");
  }

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
          <h1 className="font-display text-foreground text-3xl tracking-tight sm:text-4xl">
            Application submitted
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Your application has been received. We will be in touch.
          </p>
        </section>

        <Card className="border-border/60 bg-card/80 p-6">
          <p className="text-sm">
            You can track the status of your application from your dashboard.
          </p>
        </Card>
      </div>
    </main>
  );
}
