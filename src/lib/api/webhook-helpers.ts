/**
 * @fileoverview Webhook event processing helpers.
 *
 * Provides idempotent event persistence and application status updates
 * for carrier webhook events. All DB operations use the project's standard
 * helpers and patterns.
 *
 * Key behaviors:
 * - Idempotent: duplicate events (same provider + providerEventId) are no-ops
 * - Status update: only applies if the event is newer than the latest stored event
 * - Non-atomic: insert and status update are separate queries (small race window)
 */

import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "@/server/db";
import { application, webhookEvent, client } from "@/server/db/schemas";
import type { NormalizedWebhookEvent } from "@/lib/providers/carrier-provider";
import type { ApplicationStatus } from "@/server/db/schemas/applications-schema";
import { recordApplicationLifecycleEvent } from "@/server/audit/application-events";
import type { ApplicationEventContext } from "@/server/audit/application-events";

// ============================================================================
// TYPES
// ============================================================================

export type EventPersistResult =
  | { persisted: true; duplicate: false; statusUpdated: boolean }
  | { persisted: false; duplicate: true; statusUpdated: false }
  | { persisted: false; duplicate: false; error: string; statusUpdated: false };

interface LatestApplicationLookup {
  id: string;
  status: ApplicationStatus;
}

export interface PersistWebhookEventOptions {
  auditContext?: ApplicationEventContext;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Verify that a client exists and is not soft-deleted.
 *
 * @param clientId - UUID of the client record
 * @returns true if the client exists and is active
 */
export async function clientExists(clientId: string): Promise<boolean> {
  const db = getDb();
  const row = await db
    .select({ id: client.id })
    .from(client)
    .where(and(eq(client.id, clientId), isNull(client.deletedAt)))
    .limit(1);
  return row.length > 0;
}

/**
 * Get the latest event timestamp for a given client from a specific provider.
 *
 * @returns The most recent event timestamp, or null if no events exist
 */
export async function getLatestEventTimestamp(
  clientId: string,
  provider: string,
): Promise<Date | null> {
  const db = getDb();
  const rows = await db
    .select({ eventTimestamp: webhookEvent.eventTimestamp })
    .from(webhookEvent)
    .where(
      and(
        eq(webhookEvent.clientId, clientId),
        eq(webhookEvent.provider, provider),
      ),
    )
    .orderBy(desc(webhookEvent.eventTimestamp))
    .limit(1);

  return rows[0]?.eventTimestamp ?? null;
}

/**
 * Persist a normalized webhook event idempotently and update the
 * application's current status if the event is the latest.
 *
 * Uses ON CONFLICT DO NOTHING on the (provider, provider_event_id) unique
 * index to handle duplicate deliveries as no-ops.
 *
 * @param provider - Carrier provider identifier
 * @param event - Normalized webhook event from CarrierProvider.verifyWebhook
 * @returns Result indicating whether the event was persisted and status updated
 */
export async function persistWebhookEvent(
  provider: string,
  event: NormalizedWebhookEvent,
  options: PersistWebhookEventOptions = {},
): Promise<EventPersistResult> {
  const db = getDb();

  // 1. Verify client exists
  const exists = await clientExists(event.clientId);
  if (!exists) {
    return {
      persisted: false,
      duplicate: false,
      error: "Client not found",
      statusUpdated: false,
    };
  }

  // 2. Insert event idempotently (ON CONFLICT DO NOTHING)
  const inserted = await db
    .insert(webhookEvent)
    .values({
      clientId: event.clientId,
      provider,
      providerEventId: event.providerEventId,
      status: event.status,
      eventTimestamp: event.eventTimestamp,
      metadata: event.metadata,
    })
    .onConflictDoNothing()
    .returning();

  // If no row returned, the event was a duplicate
  if (inserted.length === 0) {
    return { persisted: false, duplicate: true, statusUpdated: false };
  }

  const latestApplication = await getLatestProviderApplication(
    db,
    event.clientId,
    provider,
  );

  if (latestApplication) {
    await recordApplicationLifecycleEvent({
      db,
      applicationId: latestApplication.id,
      status: latestApplication.status,
      source: "webhook",
      event: "webhook_received",
      occurredAt: event.eventTimestamp,
      context: options.auditContext,
      metadata: {
        providerKey: provider,
        providerEventId: event.providerEventId,
        webhookStatus: event.status,
        ...(event.metadata ?? {}),
      },
    });
  }

  // 3. Update latest provider-correlated application status only if this event
  //    is still the latest webhook event for this provider/client pair.
  const updated = await db
    .update(application)
    .set({
      status: event.status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(application.clientId, event.clientId),
        eq(application.providerKey, provider),
        isNull(application.deletedAt),
        sql`${application.id} = (
          SELECT a.id
          FROM application a
          WHERE a.client_id = ${event.clientId}
            AND a.provider_key = ${provider}
            AND a.deleted_at IS NULL
          ORDER BY COALESCE(a.submitted_at, a.created_at) DESC
          LIMIT 1
        )`,
        // Only update if no event with a later timestamp exists for this client+provider
        sql`NOT EXISTS (
          SELECT 1 FROM webhook_event we
          WHERE we.client_id = ${event.clientId}
            AND we.provider = ${provider}
            AND we.event_timestamp > ${event.eventTimestamp}
        )`,
      ),
    )
    .returning();

  const updatedApplication = updated[0];

  if (updatedApplication) {
    await recordApplicationLifecycleEvent({
      db,
      applicationId: updatedApplication.id,
      status: event.status,
      source: "provider",
      event: "status_changed",
      occurredAt: event.eventTimestamp,
      context: options.auditContext,
      metadata: {
        providerKey: provider,
        providerEventId: event.providerEventId,
        previousStatus: latestApplication?.status,
        webhookStatus: event.status,
        ...(event.metadata ?? {}),
      },
    });
  }

  return {
    persisted: true,
    duplicate: false,
    statusUpdated: updated.length > 0,
  };
}

async function getLatestProviderApplication(
  db: ReturnType<typeof getDb>,
  clientId: string,
  provider: string,
): Promise<LatestApplicationLookup | null> {
  const row = await db.query.application.findFirst({
    where: and(
      eq(application.clientId, clientId),
      eq(application.providerKey, provider),
      isNull(application.deletedAt),
    ),
    columns: {
      id: true,
      status: true,
    },
    orderBy: [desc(application.submittedAt), desc(application.createdAt)],
  });

  return row ?? null;
}

/**
 * Get the current application status for a client from the latest event.
 *
 * @param clientId - UUID of the client
 * @returns The latest application status, or null if no events exist
 */
export async function getCurrentApplicationStatus(
  clientId: string,
): Promise<ApplicationStatus | null> {
  const db = getDb();
  const rows = await db
    .select({ status: webhookEvent.status })
    .from(webhookEvent)
    .where(eq(webhookEvent.clientId, clientId))
    .orderBy(desc(webhookEvent.eventTimestamp))
    .limit(1);

  return rows[0]?.status ?? null;
}

/**
 * Get the full event timeline for a client, ordered chronologically.
 *
 * @param clientId - UUID of the client
 * @returns Array of application events in chronological order
 */
export async function getEventTimeline(clientId: string) {
  const db = getDb();
  return db
    .select()
    .from(webhookEvent)
    .where(eq(webhookEvent.clientId, clientId))
    .orderBy(webhookEvent.eventTimestamp);
}
