/**
 * @fileoverview Policy entity schema for tracking existing life insurance policies.
 *
 * Contains insurance policy records linked to clients for:
 * - Tracking existing coverage
 * - Aggregating total coverage for needs analysis
 * - Gap identification
 */

import { relations } from "drizzle-orm";
import { date, decimal, index, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { client } from "./clients-schema";
import { policyStatusEnum, policyTypeEnum } from "./enums-schema";
import { primaryId, timestamps } from "./schema-helpers";

// ============================================================================
// POLICY ENTITY
// ============================================================================

/**
 * Policy entity for tracking client insurance policies.
 *
 * Stores details about existing insurance coverage for needs analysis
 * and gap identification. Replaces the single `existingLifeInsuranceCoverage`
 * field with policy-level granularity.
 */
export const policy = pgTable(
  "policy",
  {
    id: primaryId(),

    // Ownership - links policy to the client
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id, { onDelete: "cascade" }),

    // -------------------------------------------------------------------------
    // Policy Details
    // -------------------------------------------------------------------------

    /** Policy number (optional - user may not have it handy) */
    policyNumber: text("policy_number"),

    /** Insurance carrier name (optional) */
    carrierName: text("carrier_name"),

    /** Type of life insurance policy */
    type: policyTypeEnum("type").notNull().default("term_life"),

    /** Face amount / death benefit in USD */
    faceAmount: decimal("face_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),

    /** Annual premium in USD (optional) */
    annualPremium: decimal("annual_premium", { precision: 14, scale: 2 }),

    /** Policy issue date (optional) */
    issueDate: date("issue_date"),

    /** Policy expiration date - primarily for term policies (optional) */
    expiryDate: date("expiry_date"),

    /** Cash value for permanent policies (optional) */
    cashValue: decimal("cash_value", { precision: 14, scale: 2 }),

    /** Policy status */
    status: policyStatusEnum("status").notNull().default("active"),

    /** Riders or additional benefits (freeform text) */
    riders: text("riders"),

    /** Additional notes */
    notes: text("notes"),

    // -------------------------------------------------------------------------
    // Timestamps
    // -------------------------------------------------------------------------
    ...timestamps(),
  },
  (t) => [
    index("policy_client_id_idx").on(t.clientId),
    index("policy_type_idx").on(t.type),
    index("policy_status_idx").on(t.status),
    index("policy_client_id_deleted_at_idx").on(t.clientId, t.deletedAt),
  ],
);

// ============================================================================
// POLICY RELATIONS
// ============================================================================

export const policyRelations = relations(policy, ({ one }) => ({
  client: one(client, {
    fields: [policy.clientId],
    references: [client.id],
  }),
}));
