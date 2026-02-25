import { redirect } from "next/navigation";
import { cookies } from "next/headers";

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

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string | string[] }>;
}) {
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

  const params = await searchParams;
  const roleFromParams = Array.isArray(params.role)
    ? params.role[0]
    : params.role;
  const roleFromCookie = (await cookies()).get("insurflow_role_intent")?.value;
  const initialAccountType = resolveOnboardingAccountType({
    profileAccountType: profile?.accountType,
    roleIntent: roleFromParams ?? roleFromCookie,
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
            Let&apos;s personalize your planning workspace
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-sm sm:text-base">
            We are shifting to a client-first experience. Tell us a little about
            your household and goals so your dashboard and recommendations are
            tailored from day one.
          </p>
        </div>

        <OnboardingForm
          initialProfile={{
            firstName: profile?.firstName ?? prefill.firstName,
            lastName: profile?.lastName ?? prefill.lastName,
            state: profile?.state,
            householdStatus: profile?.householdStatus as
              | "single"
              | "married"
              | "partnered"
              | "single_parent"
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
