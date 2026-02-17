/**
 * @fileoverview Corporate/business ownership schema for shareholder analysis.
 *
 * Contains entities for business ownership modeling:
 * - Business entity (corporations, partnerships, etc.)
 * - Key person tracking for key person insurance
 * - Shareholder records for buy-sell agreement planning
 * - Corporate insurance needs
 */

import { relations, sql } from "drizzle-orm";
import {
  check,
  decimal,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  date,
} from "drizzle-orm/pg-core";

import { client } from "./clients-schema";
import { businessTypeEnum, insuranceNeedTypeEnum } from "./enums-schema";

// ============================================================================
// BUSINESS ENTITY (Issue #146, PRD §3)
// ============================================================================

/**
 * Business entity owned or associated with a client.
 *
 * Models the corporate structure for shareholder analysis, key person
 * insurance, and buy-sell agreement planning.
 */
export const business = pgTable(
  "business",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Ownership - links business to the client
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id, { onDelete: "cascade" }),

    // Business details
    name: text("name").notNull(),
    type: businessTypeEnum("type").notNull(),

    /** Current business valuation */
    valuation: decimal("valuation", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),

    /** Fiscal year end date (month/day reference) */
    fiscalYearEnd: date("fiscal_year_end"),

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
    index("business_client_id_idx").on(t.clientId),
    index("business_type_idx").on(t.type),
    // Composite index for client's non-deleted businesses
    index("business_client_id_deleted_at_idx").on(t.clientId, t.deletedAt),
  ],
);

// ============================================================================
// KEY PERSON ENTITY
// ============================================================================

/**
 * Key person associated with a business.
 *
 * Tracks individuals whose loss would materially impact the business,
 * used for key person insurance needs analysis.
 */
export const keyPerson = pgTable(
  "key_person",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Ownership - links key person to the business
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),

    // Key person details
    name: text("name").notNull(),
    role: text("role").notNull(),

    /** Annual compensation */
    compensation: decimal("compensation", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),

    /** Ownership percentage (0–100) */
    ownershipPercentage: decimal("ownership_percentage", {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default("0"),

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
    index("key_person_business_id_idx").on(t.businessId),
    // Composite index for business's non-deleted key people
    index("key_person_business_id_deleted_at_idx").on(
      t.businessId,
      t.deletedAt,
    ),
  ],
);

// ============================================================================
// SHAREHOLDER ENTITY
// ============================================================================

/**
 * Shareholder of a business entity.
 *
 * Tracks ownership stakes for buy-sell agreement analysis
 * and corporate insurance needs planning.
 */
export const shareholder = pgTable(
  "shareholder",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Ownership - links shareholder to the business
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),

    // Shareholder details
    name: text("name").notNull(),

    /** Ownership percentage (0–100) */
    ownershipPercentage: decimal("ownership_percentage", {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default("0"),

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
    index("shareholder_business_id_idx").on(t.businessId),
    // Composite index for business's non-deleted shareholders
    index("shareholder_business_id_deleted_at_idx").on(
      t.businessId,
      t.deletedAt,
    ),
    // Ensure ownership percentage stays within 0–100 at the DB level
    check(
      "shareholder_ownership_pct_range",
      sql`${t.ownershipPercentage} >= 0 AND ${t.ownershipPercentage} <= 100`,
    ),
  ],
);

// ============================================================================
// CORPORATE INSURANCE NEED ENTITY
// ============================================================================

/**
 * Corporate insurance need linked to a business.
 *
 * Captures the type and amount of insurance coverage required
 * to protect the business against various risks (key person loss,
 * buy-sell funding, debt coverage, succession planning).
 */
export const corporateInsuranceNeed = pgTable(
  "corporate_insurance_need",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Ownership - links insurance need to the business
    businessId: uuid("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),

    // Insurance need details
    insuranceType: insuranceNeedTypeEnum("insurance_type").notNull(),

    /** Required coverage amount */
    coverageAmount: decimal("coverage_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),

    /** Additional notes or justification */
    notes: text("notes"),

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
    index("corporate_insurance_need_business_id_idx").on(t.businessId),
    index("corporate_insurance_need_type_idx").on(t.insuranceType),
    // Composite index for business's non-deleted insurance needs
    index("corporate_insurance_need_business_id_deleted_at_idx").on(
      t.businessId,
      t.deletedAt,
    ),
  ],
);

// ============================================================================
// CORPORATE RELATIONS
// ============================================================================

export const businessRelations = relations(business, ({ one, many }) => ({
  client: one(client, {
    fields: [business.clientId],
    references: [client.id],
  }),
  keyPeople: many(keyPerson),
  shareholders: many(shareholder),
  corporateInsuranceNeeds: many(corporateInsuranceNeed),
}));

export const keyPersonRelations = relations(keyPerson, ({ one }) => ({
  business: one(business, {
    fields: [keyPerson.businessId],
    references: [business.id],
  }),
}));

export const shareholderRelations = relations(shareholder, ({ one }) => ({
  business: one(business, {
    fields: [shareholder.businessId],
    references: [business.id],
  }),
}));

export const corporateInsuranceNeedRelations = relations(
  corporateInsuranceNeed,
  ({ one }) => ({
    business: one(business, {
      fields: [corporateInsuranceNeed.businessId],
      references: [business.id],
    }),
  }),
);
