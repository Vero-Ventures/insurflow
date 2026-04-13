/**
 * @fileoverview Client entity schema for financial needs analysis.
 *
 * Contains the core client profile including:
 * - Personal information (name, DOB, state)
 * - Health factors for insurance underwriting
 * - Income and coverage details
 * - Advanced income replacement fields (Phase 2)
 */

import {
  boolean,
  date,
  decimal,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { user } from "./auth-schema";
import {
  clientStatusEnum,
  healthRatingEnum,
  sexEnum,
  stateEnum,
} from "./enums-schema";
import { primaryId, timestamps } from "./schema-helpers";

// Forward references for relations (imported in index.ts to avoid circular deps)
// These are resolved at runtime by Drizzle

// ============================================================================
// CLIENT ENTITY (Issue #52)
// ============================================================================

/**
 * Client entity for financial needs analysis.
 *
 * Contains core profile information, health factors, and income/coverage
 * fields required for the MVP insurance needs calculation.
 */
export const client = pgTable(
  "client",
  {
    id: primaryId(),

    // Ownership - links client to the advisor who created them
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // -------------------------------------------------------------------------
    // Profile (Issue #58)
    // -------------------------------------------------------------------------
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    dateOfBirth: date("date_of_birth").notNull(),
    sex: sexEnum("sex").notNull(),
    state: stateEnum("state").notNull(),
    smoker: boolean("smoker").notNull().default(false),
    healthRating: healthRatingEnum("health_rating")
      .notNull()
      .default("standard"),

    // Spouse info
    hasSpouse: boolean("has_spouse").notNull().default(false),
    spouseAge: integer("spouse_age"),

    // -------------------------------------------------------------------------
    // Income & Coverage (Issue #61)
    // -------------------------------------------------------------------------
    /** Client's annual income in CAD */
    clientIncome: decimal("client_income", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),

    /** Spouse's annual income in CAD (optional) */
    spouseIncome: decimal("spouse_income", { precision: 14, scale: 2 }),

    /** Percentage of income to replace (e.g., 70 = 70%) */
    incomeReplacementPercent: decimal("income_replacement_percent", {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default("70"),

    /** Number of years to replace income */
    replacementDurationYears: integer("replacement_duration_years")
      .notNull()
      .default(10),

    /** Existing life insurance coverage amount in CAD */
    existingLifeInsuranceCoverage: decimal("existing_life_insurance_coverage", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),

    // -------------------------------------------------------------------------
    // Advanced Income Replacement (Phase 2)
    // -------------------------------------------------------------------------

    /** Target retirement age for duration scenarios */
    retirementAge: integer("retirement_age"),

    /** Age of youngest child (for "child turns 18" scenario) */
    youngestChildAge: integer("youngest_child_age"),

    /** Annual government survivor benefit (e.g., Social Security, CPP) */
    govSurvivorBenefit: decimal("gov_survivor_benefit", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),

    /** Annual investment income available to the survivor */
    investmentIncome: decimal("investment_income", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),

    /** Annual other income (rental, pension, etc.) */
    otherIncome: decimal("other_income", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),

    /** Additional goals or notes (informational only) */
    additionalGoals: text("additional_goals"),

    // -------------------------------------------------------------------------
    // Consent & Authorization Timestamps (Issue #165)
    // Set server-side at submission time; null until explicitly consented.
    // Once set, these must NOT be overwritten.
    // -------------------------------------------------------------------------

    /** Timestamp when user consented to transmit application data to carrier. */
    consentTransmitToCarrierAt: timestamp("consent_transmit_to_carrier_at", {
      withTimezone: true,
    }),

    /** Timestamp when user authorized collection/sharing of health information. */
    healthInfoAuthorizationAt: timestamp("health_info_authorization_at", {
      withTimezone: true,
    }),

    /** Timestamp when user acknowledged e-sign intent. */
    esignIntentAcknowledgedAt: timestamp("esign_intent_acknowledged_at", {
      withTimezone: true,
    }),

    // -------------------------------------------------------------------------
    // Status
    // -------------------------------------------------------------------------
    status: clientStatusEnum("status").notNull().default("draft"),

    // -------------------------------------------------------------------------
    // Timestamps
    // -------------------------------------------------------------------------
    ...timestamps(),
  },
  (t) => [
    index("client_user_id_idx").on(t.userId),
    index("client_status_idx").on(t.status),
    index("client_deleted_at_idx").on(t.deletedAt),
    // Composite index for the most common query pattern: user's non-deleted clients
    index("client_user_id_deleted_at_idx").on(t.userId, t.deletedAt),
    // Enforce at most one active draft per user at the DB layer.
    uniqueIndex("client_one_active_draft_per_user_idx")
      .on(t.userId)
      .where(sql`${t.status} = 'draft' AND ${t.deletedAt} IS NULL`),
  ],
);

// ============================================================================
// CLIENT RELATIONS
// ============================================================================

// Note: Complete client relations defined in index.ts to include all child entities
