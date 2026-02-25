import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  FileBarChart2,
  Handshake,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import { redirect } from "next/navigation";

import {
  getDashboardExperience,
  normalizeAccountType,
} from "@/lib/role-experience";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/server/better-auth/server";
import { getDb } from "@/server/db";
import { userProfile } from "@/server/db/schemas";
import { eq } from "drizzle-orm";

type JourneyCardProps = {
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  icon: ComponentType<{ className?: string }>;
};

const iconMap = {
  clipboard: ClipboardList,
  chart: FileBarChart2,
  handoff: Handshake,
  users: Users,
} as const;

function JourneyCard({
  title,
  description,
  href,
  ctaLabel,
  icon: Icon,
}: JourneyCardProps) {
  return (
    <Card className="border-border/60 bg-card/80 shadow-sm backdrop-blur-sm">
      <CardHeader className="space-y-3">
        <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
        <Button asChild className="w-full sm:w-auto">
          <Link href={href}>
            {ctaLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  const db = getDb();
  const profile = await db.query.userProfile.findFirst({
    where: eq(userProfile.userId, session.user.id),
    columns: { accountType: true },
  });

  const accountType = normalizeAccountType(profile?.accountType) ?? "client";
  const dashboardExperience = getDashboardExperience(accountType);

  return (
    <main className="min-h-[calc(100vh-3.5rem)] px-4 py-8 sm:py-10">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <section className="space-y-3">
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">
            {dashboardExperience.eyebrow}
          </p>
          <h1 className="font-display text-foreground text-3xl tracking-tight sm:text-4xl">
            {dashboardExperience.heading}
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
            {dashboardExperience.description}
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {dashboardExperience.cards.map((card) => {
            const Icon = iconMap[card.icon];

            return (
              <JourneyCard
                key={card.title}
                title={card.title}
                description={card.description}
                href={card.href}
                ctaLabel={card.ctaLabel}
                icon={Icon}
              />
            );
          })}
        </section>
      </div>
    </main>
  );
}
