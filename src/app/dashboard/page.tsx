import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  FileBarChart2,
  Handshake,
  History,
} from "lucide-react";
import type { ComponentType } from "react";
import { redirect } from "next/navigation";
import { desc, eq, and } from "drizzle-orm";

import {
  getDashboardExperience,
  normalizeAccountType,
} from "@/lib/role-experience";
import { getSessionUserId } from "@/lib/auth/session-utils";
import { findLatestDraft } from "@/lib/api/d2c-draft-helpers";
import { APPLY_INTAKE_ROUTE } from "@/lib/app-routes";
import { clientFieldsToD2cIntake } from "@/lib/d2c/client-adapter";
import { getDraftCompleteness } from "@/lib/d2c/client-adapter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/server/better-auth/server";
import { getDb } from "@/server/db";
import { userProfile, estimateRun } from "@/server/db/schemas";
import { DraftResumeLink } from "./draft-resume-link";

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

export function withDraftClientId(
  href: string,
  clientId: string | null,
): string {
  if (!clientId) return href;
  if (href === "/apply/estimate" || href === "/apply/review") {
    return `${href}?clientId=${encodeURIComponent(clientId)}`;
  }
  return href;
}

export default async function DashboardPage() {
  const session = await getSession();
  const userId = getSessionUserId(session);

  if (!session?.user || !userId) {
    redirect("/auth/sign-in");
  }

  const db = getDb();
  const profile = await db.query.userProfile.findFirst({
    where: eq(userProfile.userId, userId),
    columns: { accountType: true },
  });

  if (!profile) {
    redirect("/onboarding");
  }

  const accountType = normalizeAccountType(profile.accountType) ?? "client";
  const dashboardExperience = getDashboardExperience(accountType);

  // Compute draft progress for client accounts
  const draftResult = await findLatestDraft(userId);
  const draftClient =
    draftResult && draftResult.found ? draftResult.draft : null;

  let draftCompleteness = 0;
  if (draftClient) {
    const intake = clientFieldsToD2cIntake(draftClient);
    draftCompleteness = getDraftCompleteness(intake);
  }

  // Fetch recent estimate history for client accounts (up to 3 most recent)
  const recentEstimates =
    accountType === "client" && draftClient
      ? await db
          .select()
          .from(estimateRun)
          .where(
            and(
              eq(estimateRun.userId, userId),
              eq(estimateRun.clientId, draftClient.id),
            ),
          )
          .orderBy(desc(estimateRun.runNumber))
          .limit(3)
      : [];

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
                href={withDraftClientId(card.href, draftClient?.id ?? null)}
                ctaLabel={card.ctaLabel}
                icon={Icon}
              />
            );
          })}
        </section>

        {draftClient && (
          <section>
            <Card className="border-border/60 bg-card/80 shadow-sm backdrop-blur-sm">
              <CardHeader className="space-y-2">
                <p className="text-emerald text-xs font-semibold tracking-wide uppercase">
                  Application in progress
                </p>
                <CardTitle className="text-xl">
                  Resume your application
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-foreground font-medium">
                      {Math.round(draftCompleteness * 100)}%
                    </span>
                  </div>
                  <div className="bg-border h-2 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-emerald h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round(draftCompleteness * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <p className="text-muted-foreground text-sm">
                  Pick up where you left off. Your progress is saved
                  automatically.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button asChild className="bg-emerald hover:bg-emerald/90">
                    <Link
                      href={`${APPLY_INTAKE_ROUTE}?clientId=${encodeURIComponent(draftClient.id)}`}
                    >
                      Continue application
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <DraftResumeLink clientId={draftClient.id} />
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {recentEstimates.length > 0 && (
          <section>
            <Card className="border-border/60 bg-card/80 shadow-sm backdrop-blur-sm">
              <CardHeader className="space-y-2">
                <div className="flex items-center gap-2">
                  <History className="text-muted-foreground h-4 w-4" />
                  <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Estimate history
                  </p>
                </div>
                <CardTitle className="text-lg">Your past estimates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="divide-border divide-y">
                  {recentEstimates.map((estimate) => (
                    <li
                      key={estimate.id}
                      className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-0.5">
                        <p className="text-foreground text-sm font-medium">
                          Estimate #{estimate.runNumber}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {new Intl.DateTimeFormat("en-CA", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }).format(new Date(estimate.createdAt))}
                          {" · "}
                          {estimate.province}
                          {" · "}
                          {estimate.termYears}-yr term
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-foreground text-sm font-semibold">
                          {new Intl.NumberFormat("en-CA", {
                            style: "currency",
                            currency: "CAD",
                            maximumFractionDigits: 0,
                          }).format(Number(estimate.recommendedCoverage))}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {new Intl.NumberFormat("en-CA", {
                            style: "currency",
                            currency: "CAD",
                          }).format(Number(estimate.premiumLow))}
                          {" – "}
                          {new Intl.NumberFormat("en-CA", {
                            style: "currency",
                            currency: "CAD",
                          }).format(Number(estimate.premiumHigh))}
                          /mo
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="pt-1">
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={
                        draftClient
                          ? `/apply/estimate?clientId=${encodeURIComponent(draftClient.id)}`
                          : "/apply/estimate"
                      }
                    >
                      Run a new estimate
                      <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </main>
  );
}
