/**
 * @fileoverview Application entity schemas for D2C carrier-agnostic submission lifecycle.
 *
 * Implements provider-agnostic persistence for D2C submissions and status tracking:
 * - `application`: Core consumer application record (draft → submitted lifecycle)
 * - `applicationEvent`: Immutable status timeline entries for audit and display
 *
 * Design decisions:
 * - Provider correlation fields (`providerKey`, `providerApplicationId`) are nullable
 *   until submission succeeds and the provider returns a reference.
 * - `idempotencyKey` carries a unique constraint enforced at the DB level so that
 *   duplicate submit requests from retrying clients are caught atomically (#271).
 * - `submittedAt` is stored explicitly for SLA tracking; do not infer it from events.
 * - `applicationEvent` rows are intentionally hard-deleted (no soft delete) — they are
 *   an immutable audit timeline, consistent with `auditLog`. Use `timestampsNoSoftDelete`.
 * - `occurredAt` is separate from `createdAt`: provider/webhook events carry their own
 *   authoritative timestamps that may differ from DB insertion time.
 * - `source` is `text` (not a pgEnum) to stay extensible without future migrations.
 *   Expected values: "consumer" | "provider" | "system" | "webhook".
 * - Policy issuance and billing entities are explicitly out of scope for v1.
 *
 * @see Issue #267
 */

import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { user } from "./auth-schema";
import { client } from "./clients-schema";
import { applicationStatusEnum } from "./enums-schema";
import { primaryId, timestamps, timestampsCreatedOnly } from "./schema-helpers";

// ============================================================================
// APPLICATION TABLE
// ============================================================================

/**
 * Core D2C application record.
 *
 * Tracks the consumer application from draft creation through carrier submission
 * and status tracking. Soft-deletable to preserve history.
 *
 * Status lifecycle: draft -> submitted -> received -> in_review ->
 *   additional_info_requested | approved | declined
 */
export const application = pgTable(
  "application",
  {
    id: primaryId(),

    // -------------------------------------------------------------------------
    // Ownership
    // -------------------------------------------------------------------------

    /** Client this application belongs to */
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id, { onDelete: "cascade" }),

    /** User (consumer) who owns this application */
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // -------------------------------------------------------------------------
    // Idempotency
    // -------------------------------------------------------------------------

    /**
     * Client-supplied or server-assigned key used to deduplicate concurrent or
     * retried submit requests. Unique constraint is enforced at the DB level so
     * the check-then-insert is atomic and cannot race (#271).
     * Null on drafts that have not yet been assigned a submission key.
     */
    idempotencyKey: text("idempotency_key"),

    // -------------------------------------------------------------------------
    // Provider correlation (nullable until submission succeeds)
    // -------------------------------------------------------------------------

    /**
     * Identifies which carrier provider was used for submission.
     * e.g. "mock", "manulife", "sunlife"
     * Null on draft applications not yet submitted.
     */
    providerKey: text("provider_key"),

    /**
     * The provider's own application reference ID returned after successful submission.
     * Used for status polling and webhook correlation.
     * Null until provider confirms receipt.
     */
    providerApplicationId: text("provider_application_id"),

    // -------------------------------------------------------------------------
    // Lifecycle state
    // -------------------------------------------------------------------------

    /** Current application status */
    status: applicationStatusEnum("status").notNull().default("draft"),

    /**
     * Timestamp when the consumer explicitly consented to submit their application
     * to the carrier. Separate from client-level consent timestamps which cover
     * data collection.
     */
    consentCapturedAt: timestamp("consent_captured_at", { withTimezone: true }),

    /**
     * Timestamp when status transitioned from draft → submitted.
     * Stored explicitly for SLA tracking and audit; do not infer from events.
     * Null on applications still in draft state.
     */
    submittedAt: timestamp("submitted_at", { withTimezone: true }),

    ...timestamps(),
  },
  (t) => [
    index("application_client_id_idx").on(t.clientId),
    index("application_user_id_idx").on(t.userId),
    index("application_status_idx").on(t.status),
    index("application_client_id_deleted_at_idx").on(t.clientId, t.deletedAt),
    // Unique constraint on idempotency key — enforces atomic deduplication at DB level
    unique("application_idempotency_key_unique").on(t.idempotencyKey),
  ],
);

// ============================================================================
// APPLICATION EVENT TABLE
// ============================================================================

/**
 * Immutable status timeline entry for an application.
 *
 * Records every status transition for the application, whether triggered by
 * the consumer, the provider (via webhook), or the system. Provides full
 * audit trail and display history for status tracking UI.
 *
 * Hard-deleted (no soft delete) — this is an append-only event log.
 * Events are only removed via cascade when the parent application is deleted.
 */
export const applicationEvent = pgTable(
  "application_event",
  {
    id: primaryId(),

    /** Parent application */
    applicationId: uuid("application_id")
      .notNull()
      .references(() => application.id, { onDelete: "cascade" }),

    /** Application status captured at the time of this event */
    status: applicationStatusEnum("status").notNull(),

    /**
     * Who/what triggered this event.
     * Not a pgEnum — kept as text for extensibility without migrations.
     * Expected values: "consumer" | "provider" | "system" | "webhook"
     */
    source: text("source").notNull(),

    /**
     * Authoritative timestamp of when the event occurred in the real world.
     * For webhook events this is the provider's event time, not DB insertion time.
     * Defaults to DB insertion time (`DEFAULT now()`) when no external timestamp
     * is available. Uses a DB-level default so raw SQL inserts also get a value.
     */
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /**
     * Sanitized event metadata. Must not contain raw PII.
     * Safe to include: providerKey, providerEventId, previousStatus, statusReason.
     */
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),

    ...timestampsCreatedOnly(),
  },
  (t) => [
    index("application_event_application_id_idx").on(t.applicationId),
    index("application_event_status_idx").on(t.status),
    index("application_event_occurred_at_idx").on(t.occurredAt),
  ],
);

// ============================================================================
// RELATIONS
// ============================================================================

export const applicationRelations = relations(application, ({ one, many }) => ({
  client: one(client, {
    fields: [application.clientId],
    references: [client.id],
  }),
  user: one(user, { fields: [application.userId], references: [user.id] }),
  events: many(applicationEvent),
}));

export const applicationEventRelations = relations(
  applicationEvent,
  ({ one }) => ({
    application: one(application, {
      fields: [applicationEvent.applicationId],
      references: [application.id],
    }),
  }),
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/** Inferred insert type for application records */
export type ApplicationInsert = typeof application.$inferInsert;

/** Inferred select type for application records */
export type Application = typeof application.$inferSelect;

/** Inferred insert type for application event records */
export type ApplicationEventInsert = typeof applicationEvent.$inferInsert;

/** Inferred select type for application event records */
export type ApplicationEvent = typeof applicationEvent.$inferSelect;

/** Application status type literal */
export type ApplicationStatus =
  (typeof applicationStatusEnum.enumValues)[number];
