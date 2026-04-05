import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { APPLY_STATUS_ROUTE } from "@/lib/app-routes";
import { getSession } from "@/server/better-auth/server";
import { ApplySubmitAnalytics } from "./apply-submit-analytics";

export default async function ApplySubmitPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/sign-up?role=client");
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] px-4 py-8 sm:py-10">
      <ApplySubmitAnalytics />
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <section className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="bg-emerald/10 flex h-10 w-10 items-center justify-center rounded-full">
              <CheckCircle2
                className="text-emerald h-6 w-6"
                aria-hidden="true"
              />
            </div>
            <h1 className="font-display text-foreground text-3xl tracking-tight sm:text-4xl">
              Application submitted
            </h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">
            Thanks, your application has been received. We will be in touch.
          </p>
        </section>

        <Card className="border-border/60 bg-card/80 space-y-4 p-6">
          <p className="text-sm">
            Your application is now being processed. You can track its status in
            real-time as it moves through the review process.
          </p>
          <Button asChild className="bg-emerald hover:bg-emerald/90">
            <Link href={APPLY_STATUS_ROUTE}>
              Track application status
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </Card>
      </div>
    </main>
  );
}
