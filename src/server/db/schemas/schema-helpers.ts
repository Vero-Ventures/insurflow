/**
 * @fileoverview Shared schema helpers for common column patterns.
 *
 * Provides reusable column builders to eliminate duplication across schema files:
 * - Standard UUID primary keys
 * - Timestamp columns (createdAt, updatedAt, deletedAt)
 */

import { timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Standard UUID primary key with random generation.
 *
 * @example
 * export const myTable = pgTable("my_table", {
 *   id: primaryId(),
 *   // ... other columns
 * });
 */
export const primaryId = () => uuid("id").primaryKey().defaultRandom();

/**
 * Standard timestamp columns for soft-deletable entities.
 *
 * Includes:
 * - `createdAt`: Auto-set on creation
 * - `updatedAt`: Auto-updated on modification
 * - `deletedAt`: Nullable timestamp for soft deletes
 *
 * @example
 * export const myTable = pgTable("my_table", {
 *   id: primaryId(),
 *   name: text("name").notNull(),
 *   ...timestamps(),
 * });
 */
export const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

/**
 * Timestamp columns for entities WITHOUT soft delete support.
 *
 * Includes:
 * - `createdAt`: Auto-set on creation
 * - `updatedAt`: Auto-updated on modification
 *
 * Use this for entities that should be hard-deleted (e.g., join tables).
 *
 * @example
 * export const myJoinTable = pgTable("my_join_table", {
 *   id: primaryId(),
 *   ...timestampsNoSoftDelete(),
 * });
 */
export const timestampsNoSoftDelete = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull(),
});

/**
 * Timestamp columns for immutable, append-only records.
 *
 * Includes only:
 * - `createdAt`: DB-level default (`DEFAULT now()`), immutable after insert
 *
 * Use this for event logs and audit tables where rows must never be updated
 * after insertion. Matches the `auditLog` table pattern.
 *
 * @example
 * export const myEventLog = pgTable("my_event_log", {
 *   id: primaryId(),
 *   ...timestampsCreatedOnly(),
 * });
 */
export const timestampsCreatedOnly = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
