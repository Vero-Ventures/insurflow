/**
 * @fileoverview D2C application submission orchestration.
 *
 * Coordinates the full submission lifecycle:
 * 1. Create or retrieve an application record (idempotent via DB unique constraint)
 * 2. Guard against duplicate provider submissions using application status
 * 3. Call the carrier provider with retry for transient failures
 * 4. Record audit events (applicationEvent) without PII
 * 5. Return sanitized results for user display
 *
 * Design decisions:
 * - Idempotency is enforced by a unique constraint on `application.idempotencyKey`.
 *   The key is deterministic: `sub_${clientId}`, so the same client always produces
 *   the same key. Two concurrent requests race on INSERT; one wins, the other catches
 *   the unique violation and returns the existing record.
 * - Provider submission only happens from "draft" status. Once status is "submitted"
 *   or beyond, the provider is never called again.
 * - All errors logged to applicationEvent have PII stripped via sanitizeErrorForAudit.
 * - User-facing errors are mapped to safe codes via sanitizeUserError.
 *
 * @see Issue #271
 */

import { and, eq, isNull } from "drizzle-orm";

import type { CarrierProvider } from "@/lib/providers/carrier-provider";
import { withRetry } from "@/lib/submission/retry";
import {
  sanitizeErrorForAudit,
  sanitizeUserError,
  type SanitizedError,
  type SubmissionErrorCode,
} from "@/lib/submission/error-sanitizer";
import type { Database } from "@/server/db";
import {
  application,
  applicationEvent,
  type Application,
} from "@/server/db/schemas";

// ============================================================================
// Types
// ============================================================================

export interface SubmitApplicationInput {
  clientId: string;
  userId: string;
  /** Applicant details for the provider (first/last name). */
  applicant: {
    firstName: string;
    lastName: string;
  };
}

export interface SubmitApplicationSuccess {
  ok: true;
  application: Application;
  /** True if a previous submission was returned instead of creating a new one. */
  alreadySubmitted: boolean;
}

export interface SubmitApplicationFailure {
  ok: false;
  error: SanitizedError;
}

export type SubmitApplicationResult =
  | SubmitApplicationSuccess
  | SubmitApplicationFailure;

// ============================================================================
// Idempotency key
// ============================================================================

/**
 * Generates a deterministic idempotency key from the client ID.
 * A given client can only have one submission attempt.
 */
export function buildIdempotencyKey(clientId: string): string {
  return `sub_${clientId}`;
}

// ============================================================================
// Core submission function
// ============================================================================

/**
 * Submits a D2C application to the carrier provider with full idempotency
 * and error handling.
 *
 * Safe to call multiple times for the same clientId — duplicate calls
 * return the existing application without re-submitting to the provider.
 */
export async function submitToProvider(
  input: SubmitApplicationInput,
  provider: CarrierProvider,
  db: Database,
): Promise<SubmitApplicationResult> {
  const { clientId, userId, applicant } = input;
  const idempotencyKey = buildIdempotencyKey(clientId);

  // -----------------------------------------------------------------------
  // Step 1: Create or retrieve application record (idempotent)
  // -----------------------------------------------------------------------
  let app: Application;

  try {
    const result = await findOrCreateApplication(
      db,
      clientId,
      userId,
      idempotencyKey,
    );
    app = result.application;
  } catch (error) {
    console.error(
      "[submitToProvider] Failed to create application record:",
      sanitizeErrorForAudit(error),
    );
    return {
      ok: false,
      error: sanitizeUserError("INTERNAL_ERROR"),
    };
  }

  // -----------------------------------------------------------------------
  // Step 2: Guard — if already submitted or currently processing, return
  // -----------------------------------------------------------------------
  if (app.status === "received") {
    return {
      ok: false,
      error: sanitizeUserError("SUBMISSION_IN_PROGRESS"),
    };
  }

  if (app.status !== "draft") {
    return {
      ok: true,
      application: app,
      alreadySubmitted: true,
    };
  }

  // -----------------------------------------------------------------------
  // Step 2b: Claim draft -> received before external side effects
  // -----------------------------------------------------------------------
  const [claimed] = await db
    .update(application)
    .set({ status: "received" })
    .where(
      and(
        eq(application.id, app.id),
        eq(application.status, "draft"),
        isNull(application.deletedAt),
      ),
    )
    .returning();

  if (!claimed) {
    const existing = await db.query.application.findFirst({
      where: and(
        eq(application.id, app.id),
        eq(application.userId, userId),
        isNull(application.deletedAt),
      ),
    });

    if (!existing) {
      return { ok: false, error: sanitizeUserError("INTERNAL_ERROR") };
    }

    if (existing.status === "received") {
      return {
        ok: false,
        error: sanitizeUserError("SUBMISSION_IN_PROGRESS"),
      };
    }

    if (existing.status !== "draft") {
      return { ok: true, application: existing, alreadySubmitted: true };
    }

    return {
      ok: false,
      error: sanitizeUserError("SUBMISSION_IN_PROGRESS"),
    };
  }

  app = claimed;

  // -----------------------------------------------------------------------
  // Step 3: Call carrier provider with retry for transient failures
  // -----------------------------------------------------------------------
  const providerResult = await withRetry(
    () =>
      provider.submitApplication({
        draftId: clientId,
        applicant,
      }),
    { maxRetries: 2, baseDelayMs: 500 },
  );

  if (!providerResult.ok) {
    // Log failure event (audit) without PII
    await recordFailureEvent(db, app.id, providerResult, provider.providerName);
    await restoreDraftAfterProviderFailure(db, app.id);

    const errorCode: SubmissionErrorCode = providerResult.exhausted
      ? "PROVIDER_UNAVAILABLE"
      : "VALIDATION_FAILED";

    return {
      ok: false,
      error: sanitizeUserError(errorCode),
    };
  }

  // -----------------------------------------------------------------------
  // Step 4: Update application with provider response
  // -----------------------------------------------------------------------
  try {
    const [updated] = await db
      .update(application)
      .set({
        status: "submitted",
        providerKey: provider.providerName,
        providerApplicationId: providerResult.value.submissionId,
        submittedAt: new Date(),
        consentCapturedAt: new Date(),
      })
      .where(
        and(
          eq(application.id, app.id),
          eq(application.status, "received"),
          isNull(application.deletedAt),
        ),
      )
      .returning();

    if (!updated) {
      // Another request beat us — fetch current state
      const existing = await db.query.application.findFirst({
        where: and(
          eq(application.id, app.id),
          eq(application.userId, userId),
          isNull(application.deletedAt),
        ),
      });

      if (existing?.status === "received") {
        return {
          ok: false,
          error: sanitizeUserError("SUBMISSION_IN_PROGRESS"),
        };
      }

      if (existing) {
        return { ok: true, application: existing, alreadySubmitted: true };
      }

      return { ok: false, error: sanitizeUserError("INTERNAL_ERROR") };
    }

    // Record success event
    await recordSuccessEvent(
      db,
      updated.id,
      provider.providerName,
      providerResult.value.submissionId,
    );

    return { ok: true, application: updated, alreadySubmitted: false };
  } catch (error) {
    // The provider call succeeded but we failed to persist — log and return error
    console.error(
      "[submitToProvider] Failed to update application after provider success:",
      sanitizeErrorForAudit(error),
    );
    return {
      ok: false,
      error: sanitizeUserError("SUBMISSION_IN_PROGRESS"),
    };
  }
}

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Finds an existing application by idempotency key, or creates a new one.
 * Uses the DB unique constraint for atomic deduplication.
 */
async function findOrCreateApplication(
  db: Database,
  clientId: string,
  userId: string,
  idempotencyKey: string,
): Promise<{ application: Application; existed: boolean }> {
  // Check for existing first (common case for retries/refreshes)
  const existing = await db.query.application.findFirst({
    where: and(
      eq(application.idempotencyKey, idempotencyKey),
      eq(application.userId, userId),
      isNull(application.deletedAt),
    ),
  });

  if (existing) {
    return { application: existing, existed: true };
  }

  // Attempt insert — unique constraint prevents races
  try {
    const [inserted] = await db
      .insert(application)
      .values({
        clientId,
        userId,
        idempotencyKey,
        status: "draft",
      })
      .returning();

    if (!inserted) {
      throw new Error("Insert returned no rows");
    }

    return { application: inserted, existed: false };
  } catch (error) {
    // Unique constraint violation — another request won the race
    if (isUniqueViolation(error)) {
      const raced = await db.query.application.findFirst({
        where: and(
          eq(application.idempotencyKey, idempotencyKey),
          eq(application.userId, userId),
          isNull(application.deletedAt),
        ),
      });

      if (raced) {
        return { application: raced, existed: true };
      }
    }

    throw error;
  }
}

/**
 * Records a submission failure as an applicationEvent.
 * Metadata is sanitized — never contains PII.
 */
async function recordFailureEvent(
  db: Database,
  applicationId: string,
  failure: { error: unknown; attempts: number; exhausted: boolean },
  providerName: string,
): Promise<void> {
  try {
    await db.insert(applicationEvent).values({
      applicationId,
      status: "draft",
      source: "system",
      metadata: {
        event: "provider_submission_failed",
        providerKey: providerName,
        attempts: failure.attempts,
        exhausted: failure.exhausted,
        ...sanitizeErrorForAudit(failure.error),
      },
    });
  } catch (error) {
    // Best-effort — don't block the main flow
    console.error("[submitToProvider] Failed to record failure event:", error);
  }
}

/**
 * Best-effort rollback so users can retry after provider-side validation/network failures.
 */
async function restoreDraftAfterProviderFailure(
  db: Database,
  applicationId: string,
): Promise<void> {
  try {
    await db
      .update(application)
      .set({ status: "draft" })
      .where(
        and(
          eq(application.id, applicationId),
          eq(application.status, "received"),
          isNull(application.deletedAt),
        ),
      );
  } catch (error) {
    console.error(
      "[submitToProvider] Failed to restore draft status after provider failure:",
      sanitizeErrorForAudit(error),
    );
  }
}

/**
 * Records a successful submission as an applicationEvent.
 */
async function recordSuccessEvent(
  db: Database,
  applicationId: string,
  providerName: string,
  providerApplicationId: string,
): Promise<void> {
  try {
    await db.insert(applicationEvent).values({
      applicationId,
      status: "submitted",
      source: "consumer",
      metadata: {
        event: "provider_submission_succeeded",
        providerKey: providerName,
        providerApplicationId,
      },
    });
  } catch (error) {
    // Best-effort — don't block the main flow
    console.error("[submitToProvider] Failed to record success event:", error);
  }
}

/**
 * Checks if a database error is a unique constraint violation.
 * Works with both postgres-js and Neon drivers.
 */
function isUniqueViolation(error: unknown): boolean {
  if (error instanceof Error) {
    // PostgreSQL error code 23505 = unique_violation
    if ("code" in error && (error as { code: string }).code === "23505") {
      return true;
    }
    // Some drivers include it in the message
    if (error.message.includes("unique") || error.message.includes("23505")) {
      return true;
    }
  }
  return false;
}
