import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { getSession } from "@/server/better-auth/server";

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
            Thanks, your application has been received. We will be in touch.
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
