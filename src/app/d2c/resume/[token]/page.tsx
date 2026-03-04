import { redirect } from "next/navigation";
import Link from "next/link";

import { APPLY_INTAKE_ROUTE } from "@/lib/app-routes";
import { RESUME_LINK_TOKEN_REGEX } from "@/lib/validation/d2c-resume-link";
import { getSession } from "@/server/better-auth/server";
import {
  verifyResumeLink,
  markResumeLinkUsed,
} from "@/lib/api/d2c-resume-link-helpers";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Error messages displayed to users for different failure modes.
 *
 * These are intentionally vague for NOT_FOUND to prevent token enumeration.
 */
const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  EXPIRED: {
    title: "Link expired",
    description:
      "This resume link has expired. Please request a new one from your dashboard.",
  },
  ALREADY_USED: {
    title: "Link already used",
    description:
      "This resume link has already been used. You can continue your application from the dashboard.",
  },
  CLIENT_NOT_DRAFT: {
    title: "Application no longer in draft",
    description:
      "The application associated with this link has already been submitted.",
  },
  NOT_FOUND: {
    title: "Link not found",
    description:
      "This resume link could not be found or has been revoked. Please check the link and try again.",
  },
  RACE_CONDITION: {
    title: "Link already used",
    description:
      "This resume link was just used in another session. You can continue your application from the dashboard.",
  },
};

/**
 * D2C Resume Token Landing Page (Server Component).
 *
 * Verifies a resume link token, marks it as used, and redirects
 * the user to their draft application at the intake step.
 *
 * Flow:
 * 1. Validate token format
 * 2. Require authentication (redirect to sign-in if not)
 * 3. Verify token ownership, expiry, and usage status
 * 4. Atomically mark token as used
 * 5. Redirect to /apply/intake?clientId=...
 *
 * On failure, renders an error card with appropriate messaging.
 */
export default async function D2cResumeTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Validate token format before any DB work
  if (!token || !RESUME_LINK_TOKEN_REGEX.test(token)) {
    return <ResumeError errorCode="NOT_FOUND" />;
  }

  // Require authentication
  const session = await getSession();
  if (!session?.user) {
    // Redirect to sign-in with return URL so user comes back after auth
    const returnUrl = encodeURIComponent(`/d2c/resume/${token}`);
    redirect(`/auth/sign-in?callbackURL=${returnUrl}`);
  }

  // Verify the resume link (checks ownership, expiry, usage, client status)
  const result = await verifyResumeLink(token, session.user.id);

  if (!result.valid) {
    return <ResumeError errorCode={result.errorCode} />;
  }

  // Atomically mark the link as used (prevents race conditions)
  const wasMarked = await markResumeLinkUsed(result.linkId);

  if (!wasMarked) {
    return <ResumeError errorCode="RACE_CONDITION" />;
  }

  // Success — redirect to the intake page with the draft clientId
  redirect(`${APPLY_INTAKE_ROUTE}?clientId=${result.clientId}`);
}

/**
 * Error UI shown when token verification fails.
 */
function ResumeError({ errorCode }: { errorCode: string }) {
  const fallback = {
    title: "Link not found",
    description: "This resume link could not be found.",
  };
  const error = ERROR_MESSAGES[errorCode] ?? fallback;

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <Card className="border-border/60 bg-card/80 w-full max-w-md p-8 text-center">
        <h1 className="font-display text-foreground text-xl font-semibold">
          {error.title}
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          {error.description}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button asChild className="bg-emerald hover:bg-emerald/90">
            <Link href={APPLY_INTAKE_ROUTE}>Start New Application</Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}
