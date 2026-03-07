/**
 * @fileoverview Webhook event schema for carrier webhook status tracking.
 *
 * Stores normalized status events from carrier webhooks to build an
 * auditable timeline. This is separate from application lifecycle events
 * (applicationEvent) which track user/system-driven status changes.
 *
 * Design decisions:
 * - Linked to client (not application) for flexibility with pre-submission webhooks
 * - Idempotent event ingestion (unique constraint on provider + provider_event_id)
 * - Chronological timeline queries per client
 * - Status transition tracking with sanitized metadata
 * - No soft delete: events are immutable audit records
 */

import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { client } from "./clients-schema";
import { applicationStatusEnum } from "./enums-schema";
import { primaryId, timestampsCreatedOnly } from "./schema-helpers";

// ============================================================================
// WEBHOOK EVENT ENTITY
// ============================================================================

/**
 * Webhook event table for carrier webhook status updates.
 *
 * Design decisions:
 * - No soft delete: events are immutable audit records
 * - Unique index on (provider, providerEventId) for idempotent ingestion
 * - JSONB metadata for flexible carrier-specific data (sanitized before storage)
 * - eventTimestamp is the carrier-reported time; createdAt is ingestion time
 */
export const webhookEvent = pgTable(
  "webhook_event",
  {
    id: primaryId(),

    /** Reference to the client this event belongs to */
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id, { onDelete: "cascade" }),

    /** Carrier/provider identifier (e.g., "mock", "carrier_a") */
    provider: text("provider").notNull(),

    /** Provider-assigned unique event identifier for deduplication */
    providerEventId: text("provider_event_id").notNull(),

    /** Normalized application status from the generic set */
    status: applicationStatusEnum("status").notNull(),

    /** Carrier-reported event timestamp */
    eventTimestamp: timestamp("event_timestamp", {
      withTimezone: true,
    }).notNull(),

    /** Sanitized event metadata (carrier-specific details, stripped of PII) */
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),

    ...timestampsCreatedOnly(),
  },
  (t) => [
    // Deduplication: reject duplicate events from the same provider
    uniqueIndex("webhook_event_provider_event_id_uniq").on(
      t.provider,
      t.providerEventId,
    ),
    // Timeline queries: all events for a client, ordered by event time
    index("webhook_event_client_id_event_timestamp_idx").on(
      t.clientId,
      t.eventTimestamp,
    ),
    // Provider-based lookups
    index("webhook_event_provider_idx").on(t.provider),
    // Status filtering
    index("webhook_event_status_idx").on(t.status),
  ],
);

// ============================================================================
// WEBHOOK EVENT RELATIONS
// ============================================================================

export const webhookEventRelations = relations(webhookEvent, ({ one }) => ({
  client: one(client, {
    fields: [webhookEvent.clientId],
    references: [client.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/** Inferred select type for webhook events */
export type WebhookEvent = typeof webhookEvent.$inferSelect;

/** Inferred insert type for webhook events */
export type WebhookEventInsert = typeof webhookEvent.$inferInsert;
