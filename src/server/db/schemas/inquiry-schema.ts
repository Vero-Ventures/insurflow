/**
 * @fileoverview Intake inquiry schema for lead capture.
 *
 * Stores consumer intake data when they share their estimate with an advisor.
 * Allows consumers to complete intake anonymously and share with an advisor.
 */

import { relations } from "drizzle-orm";
import {
  decimal,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";
import { householdStatusEnum } from "./enums-schema";
import { primaryId, timestamps } from "./schema-helpers";

/**
 * Intake inquiry status lifecycle:
 * - pending: Created, awaiting consumer contact info submission
 * - completed: Consumer submitted their estimate + contact info
 * - viewed: Advisor has viewed the inquiry
 * - claimed: Advisor has claimed/assigned this inquiry
 * - converted: Converted to a client in the system
 * - archived: Archived by advisor
 */
export const inquiryStatusEnum = pgEnum("inquiry_status", [
  "pending",
  "completed",
  "viewed",
  "claimed",
  "converted",
  "archived",
]);

/**
 * Intake inquiry - captures consumer lead data when they share their estimate
 */
export const inquiry = pgTable(
  "inquiry",
  {
    id: primaryId(),

    // Status of the inquiry
    status: inquiryStatusEnum("status").notNull().default("pending"),

    // Contact information provided by consumer
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),

    // Optional: how they heard about us
    referralSource: text("referral_source"),

    // -------------------------------------------------------------------------
    // Intake Data (mirrors DemoIntakeData for consistency)
    // -------------------------------------------------------------------------
    householdStatus: householdStatusEnum("household_status"),
    annualHouseholdIncome: decimal("annual_household_income", {
      precision: 14,
      scale: 2,
    }),
    totalDebts: decimal("total_debts", { precision: 14, scale: 2 }),
    currentCoverage: decimal("current_coverage", { precision: 14, scale: 2 }),
    primaryGoal: text("primary_goal"),

    // -------------------------------------------------------------------------
    // Calculated estimate data (snapshot at time of submission)
    // -------------------------------------------------------------------------
    estimatedCoverageNeed: decimal("estimated_coverage_need", {
      precision: 14,
      scale: 2,
    }),
    estimatedPremium: decimal("estimated_premium", { precision: 14, scale: 2 }),
    scenarioId: text("scenario_id"),

    // -------------------------------------------------------------------------
    // Advisor assignment
    // -------------------------------------------------------------------------
    // Advisor who claimed this inquiry
    claimedByUserId: text("claimed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    claimedAt: timestamp("claimed_at"),

    // -------------------------------------------------------------------------
    // Conversion to client
    // -------------------------------------------------------------------------
    // If converted, the resulting client ID
    convertedToClientId: text("converted_to_client_id"),
    convertedAt: timestamp("converted_at"),

    // -------------------------------------------------------------------------
    // Metadata
    // -------------------------------------------------------------------------
    consumerIpAddress: text("consumer_ip_address"),
    consumerUserAgent: text("consumer_user_agent"),

    // -------------------------------------------------------------------------
    // Timestamps
    // -------------------------------------------------------------------------
    ...timestamps(),
  },
  (t) => [
    index("inquiry_status_idx").on(t.status),
    index("inquiry_email_idx").on(t.email),
    index("inquiry_claimed_by_user_idx").on(t.claimedByUserId),
    index("inquiry_created_at_idx").on(t.createdAt),
    index("inquiry_deleted_at_idx").on(t.deletedAt),
  ],
);

/**
 * Inquiry relations - defined here to avoid circular dependencies
 */
export const inquiryRelations = relations(inquiry, ({ one }) => ({
  claimedByUser: one(user, {
    fields: [inquiry.claimedByUserId],
    references: [user.id],
  }),
}));
