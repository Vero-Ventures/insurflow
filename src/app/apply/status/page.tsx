import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, FileText, Clock } from "lucide-react";

import { getSession } from "@/server/better-auth/server";
import { getSessionUserId } from "@/lib/auth/session-utils";
import {
  findApplicationStatus,
  findSubmittedApplication,
} from "@/lib/api/d2c-application-helpers";
import { APPLY_INTAKE_ROUTE } from "@/lib/app-routes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ApplicationStatusBadge } from "@/components/d2c/application-status-badge";
import {
  ApplicationTimeline,
  PendingStepsIndicator,
} from "@/components/d2c/application-timeline";

/** Provider display names */
const PROVIDER_NAMES: Record<string, string> = {
  mock: "InsurFlow Demo",
  manulife: "Manulife",
  sunlife: "Sun Life",
  canadaLife: "Canada Life",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export default async function ApplicationStatusPage() {
  const session = await getSession();
  const userId = getSessionUserId(session);

  // Auth guard: redirect to sign-up if not authenticated
  if (!session?.user || !userId) {
    redirect("/auth/sign-up?role=client");
  }

  // Find submitted application for this user
  const submittedResult = await findSubmittedApplication(userId);

  // No submitted application: show "no application" state
  if (!submittedResult.found) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] px-4 py-8 sm:py-10">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <section className="space-y-2">
            <h1 className="font-display text-foreground text-3xl tracking-tight sm:text-4xl">
              Application Status
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Track the progress of your life insurance application.
            </p>
          </section>

          <Card className="border-border/60 bg-card/80 p-6">
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
                <FileText
                  className="text-muted-foreground h-8 w-8"
                  aria-hidden="true"
                />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">No application found</h2>
                <p className="text-muted-foreground max-w-sm text-sm">
                  You haven&apos;t submitted an application yet. Start your
                  application to get a coverage estimate and track your
                  progress.
                </p>
              </div>
              <Button asChild className="bg-emerald hover:bg-emerald/90 mt-4">
                <Link href={APPLY_INTAKE_ROUTE}>
                  Start application
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  // Fetch full status with timeline
  const statusResult = await findApplicationStatus(
    submittedResult.clientId,
    userId,
  );

  // Shouldn't happen, but handle edge case
  if (!statusResult.found) {
    redirect("/dashboard");
  }

  const { application, timeline } = statusResult;
  const providerName =
    PROVIDER_NAMES[application.providerKey ?? ""] ?? application.providerKey;

  return (
    <main className="min-h-[calc(100vh-3.5rem)] px-4 py-8 sm:py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {/* Header */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-foreground text-3xl tracking-tight sm:text-4xl">
              Application Status
            </h1>
            <ApplicationStatusBadge status={application.status} />
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">
            Track the progress of your life insurance application.
          </p>
        </section>

        {/* Application Summary Card */}
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg">Application Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              {providerName && (
                <div>
                  <dt className="text-muted-foreground text-sm">Provider</dt>
                  <dd className="font-medium">{providerName}</dd>
                </div>
              )}
              {application.submittedAt && (
                <div>
                  <dt className="text-muted-foreground text-sm">Submitted</dt>
                  <dd className="flex items-center gap-1.5 font-medium">
                    <Clock className="text-muted-foreground h-3.5 w-3.5" />
                    {formatDate(application.submittedAt)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground text-sm">
                  Application ID
                </dt>
                <dd className="text-muted-foreground font-mono text-sm">
                  {application.id.slice(0, 8)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm">Last Updated</dt>
                <dd className="flex items-center gap-1.5 font-medium">
                  <Clock className="text-muted-foreground h-3.5 w-3.5" />
                  {formatDate(application.updatedAt)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Timeline Card */}
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ApplicationTimeline
              events={timeline}
              currentStatus={application.status}
            />

            {/* Pending steps indicator */}
            <div className="border-border/60 mt-6 border-t pt-6">
              <PendingStepsIndicator currentStatus={application.status} />
            </div>
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card className="border-border/60 bg-muted/30">
          <CardContent className="py-4">
            <p className="text-muted-foreground text-sm">
              <strong>Need help?</strong> If you have questions about your
              application status, please contact our support team.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
