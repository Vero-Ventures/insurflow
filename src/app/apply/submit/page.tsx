import { redirect } from "next/navigation";

import { AUTHENTICATED_HOME_ROUTE } from "@/lib/app-routes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getSession } from "@/server/better-auth/server";

export async function submitApplicationAction(formData: FormData) {
  "use server";

  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/sign-up?role=client");
  }

  const consentConfirmed = formData.get("consentConfirmed") === "true";

  if (!consentConfirmed) {
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
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">
            Step 4 of 4
          </p>
          <h1 className="font-display text-foreground text-3xl tracking-tight sm:text-4xl">
            Confirm and submit
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Review complete. Confirm consent below to submit your application.
          </p>
        </section>

        <Card className="border-border/60 bg-card/80 p-6">
          <form action={submitApplicationAction} className="space-y-5">
            <div className="flex items-start gap-3">
              <input
                id="consent-confirmed"
                name="consentConfirmed"
                type="checkbox"
                value="true"
                required
                className="mt-1 h-4 w-4"
              />
              <Label
                htmlFor="consent-confirmed"
                className="text-sm leading-relaxed font-normal"
              >
                I confirm my details are accurate and consent to submit this
                term-life application for review.
              </Label>
            </div>

            <div className="flex justify-end">
              <Button type="submit" className="bg-emerald hover:bg-emerald/90">
                Submit application
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
