/**
 * @fileoverview Asset entity schema for tracking client assets.
 *
 * MVP-lite version with fields required for total/liquid asset calculations.
 * Can be extended later with cost basis, growth rate, beneficiary allocations, etc.
 */

import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { client } from "./clients-schema";
import { assetTypeEnum } from "./enums-schema";

// ============================================================================
// ASSET ENTITY (Issue #53)
// ============================================================================

/**
 * Asset entity for tracking client assets.
 *
 * MVP-lite version with fields required for total/liquid asset calculations.
 * Can be extended later with cost basis, growth rate, beneficiary allocations, etc.
 */
export const asset = pgTable(
  "asset",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Ownership - links asset to the client
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id, { onDelete: "cascade" }),

    // Asset details
    name: text("name").notNull(),
    type: assetTypeEnum("type").notNull(),

    /** Current market value in CAD */
    currentValue: decimal("current_value", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),

    /** Whether this asset can be easily liquidated */
    isLiquid: boolean("is_liquid").notNull().default(false),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("asset_client_id_idx").on(t.clientId),
    index("asset_type_idx").on(t.type),
    // Composite index for client's non-deleted assets
    index("asset_client_id_deleted_at_idx").on(t.clientId, t.deletedAt),
  ],
);

// ============================================================================
// ASSET RELATIONS
// ============================================================================

// Note: Full asset relations defined in index.ts to avoid circular imports
export const assetRelations = relations(asset, ({ one }) => ({
  client: one(client, { fields: [asset.clientId], references: [client.id] }),
}));
