/**
 * @fileoverview D2C Application status helper functions.
 *
 * Provides read-only queries for D2C application status and timeline events.
 * Consumers can retrieve their application's current status and the full
 * immutable event timeline for display.
 *
 * Design decisions:
 * - Queries are scoped by clientId + userId for ownership enforcement.
 * - Application lookup uses the most recent non-deleted application for the
 *   client, matching the webhook-helpers pattern for provider correlation.
 * - Timeline events are returned in chronological order (oldest first) for
 *   natural display ordering.
 * - Only the `applicationEvent` table is queried for timeline data (not
 *   `webhookEvent`), since applicationEvent is the canonical audit timeline.
 *
 * @see Issue #269
 */

import { and, asc, desc, eq, isNull, ne } from "drizzle-orm";

import { getDb } from "@/server/db";
import { application, applicationEvent, client } from "@/server/db/schemas";
import type { ApplicationStatus } from "@/server/db/schemas/applications-schema";

// ============================================================================
// Types
// ============================================================================

/** Columns returned when reading an application summary. */
const APPLICATION_SELECT_COLUMNS = {
  id: true,
  clientId: true,
  status: true,
  providerKey: true,
  submittedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Column selection for timeline event queries.
 * Uses explicit column references for type-safe `.select()`.
 */
const EVENT_SELECT = {
  id: applicationEvent.id,
  status: applicationEvent.status,
  source: applicationEvent.source,
  occurredAt: applicationEvent.occurredAt,
  metadata: applicationEvent.metadata,
  createdAt: applicationEvent.createdAt,
} as const;

/** Application summary returned by status queries. */
export interface ApplicationSummary {
  id: string;
  clientId: string;
  status: ApplicationStatus;
  providerKey: string | null;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Timeline event returned by status queries. */
export interface TimelineEvent {
  id: string;
  status: ApplicationStatus;
  source: string;
  occurredAt: Date;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface ApplicationStatusSuccess {
  found: true;
  application: ApplicationSummary;
  timeline: TimelineEvent[];
}

export interface ApplicationStatusNotFound {
  found: false;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Retrieves the application status and event timeline for a client.
 *
 * Ownership is enforced by requiring both clientId and userId to match.
 * Returns the most recent non-deleted application for the client along
 * with its full event timeline in chronological order.
 *
 * @param clientId - UUID of the client record
 * @param userId - Authenticated user's ID (ownership check)
 * @returns Application summary + timeline, or not-found
 */
export async function findApplicationStatus(
  clientId: string,
  userId: string,
): Promise<ApplicationStatusSuccess | ApplicationStatusNotFound> {
  const db = getDb();

  // Verify the client exists and is owned by this user (not soft-deleted)
  const clientRecord = await db.query.client.findFirst({
    where: and(
      eq(client.id, clientId),
      eq(client.userId, userId),
      isNull(client.deletedAt),
    ),
    columns: { id: true },
  });

  if (!clientRecord) {
    return { found: false };
  }

  // Find the most recent application for this client (not soft-deleted)
  const appRecord = await db.query.application.findFirst({
    where: and(
      eq(application.clientId, clientId),
      eq(application.userId, userId),
      isNull(application.deletedAt),
    ),
    columns: APPLICATION_SELECT_COLUMNS,
    orderBy: [desc(application.createdAt)],
  });

  if (!appRecord) {
    return { found: false };
  }

  // Fetch the full event timeline in chronological order
  const events = await db
    .select(EVENT_SELECT)
    .from(applicationEvent)
    .where(eq(applicationEvent.applicationId, appRecord.id))
    .orderBy(asc(applicationEvent.occurredAt));

  return {
    found: true,
    application: appRecord as ApplicationSummary,
    timeline: events as TimelineEvent[],
  };
}

// ============================================================================
// Dashboard Helpers
// ============================================================================

/**
 * Finds the most recent submitted (non-draft) application for a user.
 *
 * Used by the dashboard to show "Track your application" card for users
 * who have submitted an application. Returns only applications with status
 * other than "draft".
 *
 * @param userId - Authenticated user's ID
 * @returns Application summary if found, or not-found
 */
export async function findSubmittedApplication(
  userId: string,
): Promise<
  | { found: true; application: ApplicationSummary; clientId: string }
  | { found: false }
> {
  const db = getDb();

  // Find the most recent non-draft application for this user
  const appRecord = await db.query.application.findFirst({
    where: and(
      eq(application.userId, userId),
      isNull(application.deletedAt),
      ne(application.status, "draft"),
    ),
    columns: {
      ...APPLICATION_SELECT_COLUMNS,
      clientId: true,
    },
    orderBy: [desc(application.createdAt)],
  });

  if (!appRecord) {
    return { found: false };
  }

  return {
    found: true,
    application: appRecord as ApplicationSummary,
    clientId: appRecord.clientId,
  };
}
