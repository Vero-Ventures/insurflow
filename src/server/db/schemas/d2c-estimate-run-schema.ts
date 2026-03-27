/**
 * @fileoverview D2C Estimate Run schema for storing estimate history.
 *
 * Records each estimate run associated with a D2C client draft so users can
 * revisit their past estimates from the dashboard.
 */

import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { user } from "./auth-schema";
import { client } from "./clients-schema";
import { stateEnum } from "./enums-schema";
import { primaryId, timestampsCreatedOnly } from "./schema-helpers";

// ============================================================================
// ESTIMATE RUN ENTITY
// ============================================================================

/**
 * Records each time a user runs an estimate in the D2C flow.
 *
 * Append-only: rows are never updated after insertion.
 * Run numbers are sequential per client (1, 2, 3, …).
 */
export const estimateRun = pgTable(
  "estimate_run",
  {
    id: primaryId(),

    /** Reference to the D2C client draft */
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id, { onDelete: "cascade" }),

    /** Owner of the draft – required for authorisation */
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    /** Sequential run number for this client (1-based) */
    runNumber: integer("run_number").notNull(),

    /** Recommended coverage amount in CAD */
    recommendedCoverage: numeric("recommended_coverage", {
      precision: 14,
      scale: 2,
    }).notNull(),

    /** Lower bound of estimated monthly premium in CAD */
    premiumLow: numeric("premium_low", { precision: 10, scale: 2 }).notNull(),

    /** Upper bound of estimated monthly premium in CAD */
    premiumHigh: numeric("premium_high", { precision: 10, scale: 2 }).notNull(),

    /** Term length in years used for this estimate */
    termYears: integer("term_years").notNull(),

    /** Canadian province used for this estimate */
    province: stateEnum("province").notNull(),

    ...timestampsCreatedOnly(),
  },
  (t) => [
    index("estimate_run_client_id_idx").on(t.clientId),
    index("estimate_run_user_id_idx").on(t.userId),
    // Enforce uniqueness so concurrent inserts cannot produce duplicate run numbers
    uniqueIndex("estimate_run_client_run_number_uidx").on(
      t.clientId,
      t.runNumber,
    ),
  ],
);

// ============================================================================
// RELATIONS
// ============================================================================

export const estimateRunRelations = relations(estimateRun, ({ one }) => ({
  client: one(client, {
    fields: [estimateRun.clientId],
    references: [client.id],
  }),
  user: one(user, {
    fields: [estimateRun.userId],
    references: [user.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type EstimateRun = typeof estimateRun.$inferSelect;
export type EstimateRunInsert = typeof estimateRun.$inferInsert;
