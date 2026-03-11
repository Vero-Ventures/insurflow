/**
 * @fileoverview Life event recalculation schema.
 *
 * Tracks major life events (income change, new child, debt change,
 * marriage, divorce) that trigger insurance needs recalculations.
 * Stores before/after snapshots to enable visible before/after comparison.
 */

import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { user } from "./auth-schema";
import { client } from "./clients-schema";
import { lifeEventTypeEnum } from "./enums-schema";

// ============================================================================
// LIFE EVENT RECALCULATION TABLE
// ============================================================================

/**
 * Snapshot of a single insurance needs estimate stored at life event trigger time.
 * Contains only the core financial figures needed for before/after comparison.
 */
export interface InsuranceNeedsSnapshot {
  incomeReplacementNeeds: number;
  debtPayoffNeeds: number;
  estateBufferNeeds: number;
  grossNeeds: number;
  existingCoverage: number;
  liquidAssets: number;
  totalInsuranceNeeds: number;
}

/**
 * Life event recalculation record.
 *
 * Created when an advisor records a major life event for a client.
 * Stores:
 * - the event type and optional notes
 * - a before snapshot (current estimate when the event is triggered)
 * - an after snapshot (freshly computed estimate at trigger time; reflects
 *   current client data, allowing advisors to see the change after they've
 *   updated the client's financial profile)
 *
 * Design decisions:
 * - No soft delete: records are audit artifacts and should not be hidden
 * - afterSnapshot may equal beforeSnapshot when no client data has changed;
 *   this is expected and indicates the baseline was captured for future reference
 */
export const lifeEventRecalculation = pgTable(
  "life_event_recalculation",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** The client this recalculation belongs to */
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id, { onDelete: "cascade" }),

    /** The advisor who triggered the recalculation */
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    /** The life event that triggered the recalculation */
    lifeEvent: lifeEventTypeEnum("life_event").notNull(),

    /** Optional advisor notes explaining the life event context */
    notes: text("notes"),

    /** Timestamp when the life event was recorded */
    triggeredAt: timestamp("triggered_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),

    /**
     * Insurance needs snapshot BEFORE the life event.
     * Provided by the client (mirrors the last estimate they had on screen).
     */
    beforeSnapshot: jsonb("before_snapshot")
      .$type<InsuranceNeedsSnapshot>()
      .notNull(),

    /**
     * Insurance needs snapshot AFTER the life event.
     * Computed server-side at trigger time using current client data.
     */
    afterSnapshot: jsonb("after_snapshot")
      .$type<InsuranceNeedsSnapshot>()
      .notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [
    index("life_event_recalculation_client_id_idx").on(t.clientId),
    index("life_event_recalculation_triggered_at_idx").on(t.triggeredAt),
  ],
);

// ============================================================================
// RELATIONS
// ============================================================================

export const lifeEventRecalculationRelations = relations(
  lifeEventRecalculation,
  ({ one }) => ({
    client: one(client, {
      fields: [lifeEventRecalculation.clientId],
      references: [client.id],
    }),
    user: one(user, {
      fields: [lifeEventRecalculation.userId],
      references: [user.id],
    }),
  }),
);

// ============================================================================
// TYPES
// ============================================================================

export type LifeEventRecalculation = typeof lifeEventRecalculation.$inferSelect;
export type LifeEventRecalculationInsert =
  typeof lifeEventRecalculation.$inferInsert;
export type LifeEventType = (typeof lifeEventTypeEnum.enumValues)[number];
