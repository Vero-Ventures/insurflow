import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
  deriveOnboardingPrefill,
  isOnboardingProfileComplete,
  onboardingProfileSchema,
} from "@/lib/onboarding";
import { getSessionUserId } from "@/lib/auth/session-utils";
import {
  handleValidationError,
  parseJsonBody,
  withApiHandler,
} from "@/lib/api/route-helpers";
import { getDb } from "@/server/db";
import { userProfile } from "@/server/db/schemas/user-profile-schema";
import { user } from "@/server/db/schemas/auth-schema";

export const GET = withApiHandler(
  {
    endpoint: "/api/onboarding/profile",
    method: "GET",
  },
  async (_request, { logger, session }) => {
    const userId = getSessionUserId(session);
    if (!userId) {
      await logger.warn("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const profile = await db.query.userProfile.findFirst({
      where: eq(userProfile.userId, userId),
    });

    const prefill = deriveOnboardingPrefill(session.user.name);
    const onboardingData = {
      firstName: profile?.firstName ?? prefill.firstName,
      lastName: profile?.lastName ?? prefill.lastName,
      state: profile?.state ?? "",
      householdStatus: profile?.householdStatus ?? "",
      primaryGoal: profile?.primaryGoal ?? "",
      communicationPreference: profile?.communicationPreference ?? "",
      accountType: profile?.accountType ?? "",
    };

    return {
      data: {
        profile: onboardingData,
        isComplete: isOnboardingProfileComplete(profile),
        completedAt: profile?.onboardingCompletedAt ?? null,
      },
    };
  },
);

export const PUT = withApiHandler(
  {
    endpoint: "/api/onboarding/profile",
    method: "PUT",
  },
  async (request, { logger, session }) => {
    const userId = getSessionUserId(session);
    if (!userId) {
      await logger.warn("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await logger.info("Onboarding PUT session diagnostics", {
      hasSessionUser: Boolean(session?.user),
      hasSessionUserId: Boolean(session?.user?.id),
      hasSessionFallbackUserId: Boolean(session?.session?.userId),
      hasResolvedUserId: Boolean(userId),
      hasUserTable: Boolean(user),
      hasUserTableId: Boolean(user && "id" in user && user.id),
    });

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
    const now = new Date();
    const db = getDb();

    await db
      .insert(userProfile)
      .values({
        userId,
        firstName: data.firstName,
        lastName: data.lastName,
        state: data.state,
        householdStatus: data.householdStatus,
        primaryGoal: data.primaryGoal,
        communicationPreference: data.communicationPreference,
        accountType: data.accountType,
        onboardingCompletedAt: now,
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
          accountType: data.accountType,
          onboardingCompletedAt: now,
          updatedAt: now,
        },
      });

    if (user && "id" in user && user.id) {
      await db
        .update(user)
        .set({
          name: fullName,
          updatedAt: now,
        })
        .where(eq(user.id, userId));
    } else {
      await logger.warn("Skipped user name sync: auth user table unavailable", {
        hasUserTable: Boolean(user),
      });
    }

    await logger.info("Onboarding profile updated", {
      statusCode: 200,
      onboardingCompleted: true,
    });

    return {
      data: {
        profile: data,
        isComplete: true,
      },
    };
  },
);
