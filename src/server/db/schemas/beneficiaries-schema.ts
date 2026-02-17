/**
 * @fileoverview Beneficiary and asset allocation schemas.
 *
 * Contains:
 * - Beneficiary entity for tracking people/entities receiving assets
 * - Asset allocation entity linking beneficiaries to specific assets
 *
 * Used for estate planning and insurance allocation gap analysis.
 */

import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  decimal,
  index,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { asset } from "./assets-schema";
import { client } from "./clients-schema";
import { beneficiaryRelationshipEnum } from "./enums-schema";
import {
  primaryId,
  timestamps,
  timestampsNoSoftDelete,
} from "./schema-helpers";

// ============================================================================
// BENEFICIARY ENTITY (PRD §4)
// ============================================================================

/**
 * Beneficiary entity for tracking client beneficiaries.
 *
 * Stores information about people/entities who will receive assets upon
 * the client's death. Used for estate planning and insurance allocation.
 */
export const beneficiary = pgTable(
  "beneficiary",
  {
    id: primaryId(),

    // Ownership - links beneficiary to the client
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id, { onDelete: "cascade" }),

    // Beneficiary details
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    dateOfBirth: date("date_of_birth"),
    relationship: beneficiaryRelationshipEnum("relationship").notNull(),

    /** Whether this beneficiary is primary (vs contingent) */
    isPrimary: boolean("is_primary").notNull().default(true),

    /** Optional notes about this beneficiary */
    notes: text("notes"),

    // Timestamps
    ...timestamps(),
  },
  (t) => [
    index("beneficiary_client_id_idx").on(t.clientId),
    index("beneficiary_relationship_idx").on(t.relationship),
    // Composite index for client's non-deleted beneficiaries
    index("beneficiary_client_id_deleted_at_idx").on(t.clientId, t.deletedAt),
  ],
);

// ============================================================================
// ASSET ALLOCATION ENTITY (PRD §4)
// ============================================================================

/**
 * Asset allocation entity linking beneficiaries to assets.
 *
 * Tracks both desired allocation (what the client wants) and actual allocation
 * (what's currently designated on the asset). Used for gap analysis to identify
 * mismatches between intended and actual beneficiary designations.
 */
export const assetAllocation = pgTable(
  "asset_allocation",
  {
    id: primaryId(),

    // Links to beneficiary and asset
    beneficiaryId: uuid("beneficiary_id")
      .notNull()
      .references(() => beneficiary.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => asset.id, { onDelete: "cascade" }),

    /**
     * Desired allocation percentage (0-100)
     * What the client WANTS this beneficiary to receive from this asset
     */
    desiredPercent: decimal("desired_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),

    /**
     * Actual allocation percentage (0-100)
     * What is CURRENTLY designated on the asset's beneficiary form
     */
    actualPercent: decimal("actual_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),

    /** Notes about this allocation (e.g., "Needs to update beneficiary form") */
    notes: text("notes"),

    // Timestamps (no deletedAt - allocations are hard-deleted)
    ...timestampsNoSoftDelete(),
  },
  (t) => [
    index("asset_allocation_beneficiary_id_idx").on(t.beneficiaryId),
    index("asset_allocation_asset_id_idx").on(t.assetId),
    // Unique constraint: one allocation record per beneficiary-asset pair
    uniqueIndex("asset_allocation_beneficiary_asset_idx").on(
      t.beneficiaryId,
      t.assetId,
    ),
  ],
);

// ============================================================================
// BENEFICIARY RELATIONS
// ============================================================================

export const beneficiaryRelations = relations(beneficiary, ({ one, many }) => ({
  client: one(client, {
    fields: [beneficiary.clientId],
    references: [client.id],
  }),
  allocations: many(assetAllocation),
}));

export const assetAllocationRelations = relations(
  assetAllocation,
  ({ one }) => ({
    beneficiary: one(beneficiary, {
      fields: [assetAllocation.beneficiaryId],
      references: [beneficiary.id],
    }),
    asset: one(asset, {
      fields: [assetAllocation.assetId],
      references: [asset.id],
    }),
  }),
);
