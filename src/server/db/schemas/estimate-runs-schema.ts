/**
 * @fileoverview Estimate run and assumption version schemas.
 *
 * Implements server-authoritative estimate persistence for the D2C flow,
 * enabling historical query, reproducibility, and assumption versioning.
 *
 * Tables:
 * - `assumptionVersion`: Immutable, versioned assumption sets with effective
 *   date ranges. Each row captures a specific set of financial assumptions
 *   (income replacement %, duration, estate buffer) used by the estimate engine.
 *   Rows are append-only — superseded versions are never deleted.
 *
 * - `estimateRun`: Immutable record of a single estimate execution. Stores
 *   the full input snapshot, computed outputs (insurance needs breakdown,
 *   premium range), engine metadata, and a reference to the assumption version.
 *   Rows are append-only — they are audit artifacts, never updated or deleted.
 *
 * Design decisions:
 * - Both tables use `timestampsCreatedOnly()` — rows are immutable event records.
 * - `estimateRun.inputs` and `estimateRun.outputs` are JSONB snapshots so the
 *   full calculation context is preserved even if the engine evolves later.
 * - Persisted estimate runs currently require an owned client draft and user.
 * - `estimateRun.assumptionVersionId` references the assumption set used,
 *   enabling exact reproduction of any historical estimate.
 * - Monetary values in JSONB are numbers (not decimal strings) because they
 *   are engine outputs already rounded to 2dp at the boundary.
 *
 * @see Issue #226
 */

import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type {
  AssumptionParameters,
  EstimateRunInputs,
  EstimateRunOutputs,
} from "@/lib/d2c/estimate-types";

import { user } from "./auth-schema";
import { client } from "./clients-schema";
import { estimateSourceEnum } from "./enums-schema";
import { primaryId, timestampsCreatedOnly } from "./schema-helpers";

// ============================================================================
// JSONB TYPE INTERFACES
// ============================================================================

/**
 * Assumption parameters stored as a versioned snapshot.
 * These are the "magic numbers" that drive the insurance needs calculation.
 */
// ============================================================================
// ASSUMPTION VERSION TABLE
// ============================================================================

/**
 * Immutable, versioned assumption set for insurance needs calculations.
 *
 * Each row represents a specific configuration of financial assumptions
 * used by the estimate engine. New versions are created when assumptions
 * change (e.g., regulatory update, product change); old versions remain
 * for historical reference and estimate reproducibility.
 *
 * Effective date range enables querying which assumption set was active
 * at any given point in time.
 */
export const assumptionVersion = pgTable(
  "assumption_version",
  {
    id: primaryId(),

    /** Human-readable version label (e.g., "ca-term-life-v1") */
    versionLabel: text("version_label").notNull(),

    /** Product line this assumption set applies to */
    productLine: text("product_line").notNull(),

    /** Date when this version became effective (inclusive) */
    effectiveFrom: date("effective_from").notNull(),

    /**
     * Date when this version was superseded (exclusive).
     * Null means currently active.
     */
    effectiveTo: date("effective_to"),

    /** The assumption parameters as a JSONB snapshot */
    parameters: jsonb("parameters").$type<AssumptionParameters>().notNull(),

    /** Optional notes explaining why this version was created */
    changeNotes: text("change_notes"),

    ...timestampsCreatedOnly(),
  },
  (t) => [
    unique("assumption_version_product_line_label_unique").on(
      t.productLine,
      t.versionLabel,
    ),
    index("assumption_version_product_line_idx").on(t.productLine),
    index("assumption_version_effective_from_idx").on(t.effectiveFrom),
  ],
);

// ============================================================================
// ESTIMATE RUN TABLE
// ============================================================================

/**
 * Immutable record of a single estimate execution.
 *
 * Captures the complete context of an estimate: who requested it, what
 * assumptions were used, what inputs were provided, and what the engine
 * computed. Enables historical query, audit trail, and reproducibility.
 *
 * Rows are append-only — estimates are never updated or deleted.
 */
export const estimateRun = pgTable(
  "estimate_run",
  {
    id: primaryId(),

    // -------------------------------------------------------------------------
    // Ownership
    // -------------------------------------------------------------------------

    /** Client record this estimate belongs to. */
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id),

    /** User who triggered this estimate */
    userId: text("user_id")
      .notNull()
      .references(() => user.id),

    // -------------------------------------------------------------------------
    // Context
    // -------------------------------------------------------------------------

    /** Whether this estimate was generated via D2C or advisor flow */
    source: estimateSourceEnum("source").notNull(),

    /** Reference to the assumption version used for this estimate */
    assumptionVersionId: uuid("assumption_version_id")
      .notNull()
      .references(() => assumptionVersion.id),

    // -------------------------------------------------------------------------
    // Engine metadata
    // -------------------------------------------------------------------------

    /** Engine identifier (e.g., "insurance-needs-v1") */
    engineId: text("engine_id").notNull(),

    /** Engine version string for reproducibility */
    engineVersion: text("engine_version").notNull(),

    /** Provider used for premium estimation (e.g., "mock") */
    providerKey: text("provider_key").notNull(),

    // -------------------------------------------------------------------------
    // Snapshots (JSONB)
    // -------------------------------------------------------------------------

    /** Full input snapshot at execution time */
    inputs: jsonb("inputs").$type<EstimateRunInputs>().notNull(),

    /** Full output snapshot at execution time */
    outputs: jsonb("outputs").$type<EstimateRunOutputs>().notNull(),

    /**
     * Ordinal position of this estimate within the client's history.
     * 1 = first estimate, incremented for each subsequent run per client.
     * Useful for displaying "Estimate #N" in UI.
     */
    runNumber: integer("run_number").notNull().default(1),

    ...timestampsCreatedOnly(),
  },
  (t) => [
    index("estimate_run_client_id_idx").on(t.clientId),
    index("estimate_run_user_id_idx").on(t.userId),
    index("estimate_run_assumption_version_id_idx").on(t.assumptionVersionId),
    index("estimate_run_created_at_idx").on(t.createdAt),

    unique("estimate_run_client_id_run_number_unique").on(
      t.clientId,
      t.runNumber,
    ),
  ],
);

// ============================================================================
// RELATIONS
// ============================================================================

export const assumptionVersionRelations = relations(
  assumptionVersion,
  ({ many }) => ({
    estimateRuns: many(estimateRun),
  }),
);

export const estimateRunRelations = relations(estimateRun, ({ one }) => ({
  client: one(client, {
    fields: [estimateRun.clientId],
    references: [client.id],
  }),
  user: one(user, {
    fields: [estimateRun.userId],
    references: [user.id],
  }),
  assumptionVersion: one(assumptionVersion, {
    fields: [estimateRun.assumptionVersionId],
    references: [assumptionVersion.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/** Inferred select type for assumption version records */
export type AssumptionVersion = typeof assumptionVersion.$inferSelect;

/** Inferred insert type for assumption version records */
export type AssumptionVersionInsert = typeof assumptionVersion.$inferInsert;

/** Inferred select type for estimate run records */
export type EstimateRun = typeof estimateRun.$inferSelect;

/** Inferred insert type for estimate run records */
export type EstimateRunInsert = typeof estimateRun.$inferInsert;

/** Estimate source type literal */
export type EstimateSource = (typeof estimateSourceEnum.enumValues)[number];

export type {
  AssumptionParameters,
  EstimateRunInputs,
  EstimateRunOutputs,
};
