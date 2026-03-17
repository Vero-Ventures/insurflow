import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import {
  deriveOnboardingPrefill,
  isOnboardingProfileComplete,
} from "@/lib/onboarding";
import { AUTHENTICATED_HOME_ROUTE } from "@/lib/app-routes";
import { getSessionUserId } from "@/lib/auth/session-utils";
import { resolveOnboardingAccountType } from "@/lib/role-experience";
import { getSession } from "@/server/better-auth/server";
import { getDb } from "@/server/db";
import { userProfile } from "@/server/db/schemas";
import { eq } from "drizzle-orm";

export default async function OnboardingPage() {
  const session = await getSession();
  const userId = getSessionUserId(session);

  if (!session?.user || !userId) {
    redirect("/auth/sign-in");
  }

  const db = getDb();
  const profile = await db.query.userProfile.findFirst({
    where: eq(userProfile.userId, userId),
  });

  if (isOnboardingProfileComplete(profile)) {
    redirect(AUTHENTICATED_HOME_ROUTE);
  }

  const initialAccountType = resolveOnboardingAccountType({
    profileAccountType: profile?.accountType,
  });

  const prefill = deriveOnboardingPrefill(session.user.name);

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-[radial-gradient(ellipse_at_top,oklch(0.696_0.17_162.48_/_0.06),transparent_65%)] px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">
            Welcome to InsurFlow
          </p>
          <h1 className="font-display text-foreground text-4xl tracking-tight">
            Let&apos;s set up your account
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-sm sm:text-base">
            Share a few details about your household and goals so your dashboard
            and application steps feel tailored from day one.
          </p>
        </div>

        <OnboardingForm
          initialProfile={{
            firstName: profile?.firstName ?? prefill.firstName,
            lastName: profile?.lastName ?? prefill.lastName,
            state: profile?.state,
            householdStatus: profile?.householdStatus as
              | "single"
              | "partnered"
              | "family"
              | undefined,
            primaryGoal: profile?.primaryGoal as
              | "family_protection"
              | "debt_coverage"
              | "retirement_security"
              | "estate_planning"
              | undefined,
            communicationPreference: profile?.communicationPreference as
              | "email"
              | "phone"
              | "sms"
              | undefined,
            accountType: initialAccountType,
          }}
        />
      </div>
    </main>
  );
}
