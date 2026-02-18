import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
  deriveOnboardingPrefill,
  isOnboardingProfileComplete,
  onboardingProfileSchema,
} from "@/lib/onboarding";
import {
  handleValidationError,
  parseJsonBody,
  validateSession,
} from "@/lib/api/route-helpers";
import { createLogger } from "@/server/axiom";
import { getDb } from "@/server/db";
import { user, userProfile } from "@/server/db/schemas";

export async function GET() {
  const logger = createLogger({
    endpoint: "/api/onboarding/profile",
    method: "GET",
  });

  try {
    const sessionResult = await validateSession(logger);
    if ("error" in sessionResult) return sessionResult.error;
    const { session } = sessionResult;

    logger.addContext({ userId: session.user.id });

    const db = getDb();
    const profile = await db.query.userProfile.findFirst({
      where: eq(userProfile.userId, session.user.id),
    });

    const prefill = deriveOnboardingPrefill(session.user.name);

    const onboardingData = {
      firstName: profile?.firstName ?? prefill.firstName,
      lastName: profile?.lastName ?? prefill.lastName,
      state: profile?.state ?? "",
      householdStatus: profile?.householdStatus ?? "",
      primaryGoal: profile?.primaryGoal ?? "",
      communicationPreference: profile?.communicationPreference ?? "",
    };

    return NextResponse.json({
      profile: onboardingData,
      isComplete: isOnboardingProfileComplete(
        profile
          ? {
              firstName: profile.firstName,
              lastName: profile.lastName,
              state: profile.state,
              householdStatus: profile.householdStatus,
              primaryGoal: profile.primaryGoal,
              communicationPreference: profile.communicationPreference,
            }
          : undefined,
      ),
      completedAt: profile?.onboardingCompletedAt ?? null,
    });
  } catch (error) {
    await logger.error(
      "Failed to fetch onboarding profile",
      error instanceof Error ? error : new Error(String(error)),
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const logger = createLogger({
    endpoint: "/api/onboarding/profile",
    method: "PUT",
  });

  try {
    const sessionResult = await validateSession(logger);
    if ("error" in sessionResult) return sessionResult.error;
    const { session } = sessionResult;

    logger.addContext({ userId: session.user.id });

    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) return bodyResult.error;

    const validationResult = onboardingProfileSchema.safeParse(bodyResult.body);
    if (!validationResult.success) {
      return handleValidationError(
        logger,
        validationResult.error,
        "Invalid onboarding profile",
      );
    }

    const data = validationResult.data;
    const fullName = `${data.firstName} ${data.lastName}`.trim();
    const db = getDb();

    await db
      .insert(userProfile)
      .values({
        userId: session.user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        state: data.state,
        householdStatus: data.householdStatus,
        primaryGoal: data.primaryGoal,
        communicationPreference: data.communicationPreference,
        onboardingCompletedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userProfile.userId,
        set: {
          firstName: data.firstName,
          lastName: data.lastName,
          state: data.state,
          householdStatus: data.householdStatus,
          primaryGoal: data.primaryGoal,
          communicationPreference: data.communicationPreference,
          onboardingCompletedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    await db
      .update(user)
      .set({
        name: fullName,
        updatedAt: new Date(),
      })
      .where(eq(user.id, session.user.id));

    await logger.info("Onboarding profile updated", {
      statusCode: 200,
      onboardingCompleted: true,
    });

    return NextResponse.json({
      profile: data,
      isComplete: true,
    });
  } catch (error) {
    await logger.error(
      "Failed to update onboarding profile",
      error instanceof Error ? error : new Error(String(error)),
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
