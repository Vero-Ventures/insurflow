/**
 * @fileoverview Share link schema for client-generated estimate sharing.
 *
 * Stores estimate data and generates unique tokens for sharing with advisors.
 */

import { relations } from "drizzle-orm";
import {
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";
import { householdStatusEnum } from "./enums-schema";
import { primaryId, timestamps } from "./schema-helpers";

export const shareLinkStatusEnum = pgEnum("share_link_status", [
  "active",
  "viewed",
  "interested",
  "expired",
]);

export const shareLink = pgTable(
  "share_link",
  {
    id: primaryId(),

    token: text("token").notNull().unique(),

    status: shareLinkStatusEnum("status").notNull().default("active"),

    expiresAt: timestamp("expires_at").notNull(),

    viewedAt: timestamp("viewed_at"),

    interestedAt: timestamp("interested_at"),

    claimedByUserId: text("claimed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),

    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),

    householdStatus: householdStatusEnum("household_status"),
    annualHouseholdIncome: decimal("annual_household_income", {
      precision: 14,
      scale: 2,
    }),
    totalDebts: decimal("total_debts", { precision: 14, scale: 2 }),
    currentCoverage: decimal("current_coverage", { precision: 14, scale: 2 }),
    primaryGoal: text("primary_goal"),

    estimatedCoverageNeed: decimal("estimated_coverage_need", {
      precision: 14,
      scale: 2,
    }),
    estimatedGap: decimal("estimated_gap", { precision: 14, scale: 2 }),
    scenarioId: text("scenario_id"),

    incomeReplacementPercent: decimal("income_replacement_percent", {
      precision: 5,
      scale: 2,
    }),
    replacementDurationYears: integer("replacement_duration_years"),
    liquidAssets: decimal("liquid_assets", { precision: 14, scale: 2 }),

    referrerEmail: text("referrer_email"),

    consumerIpAddress: text("consumer_ip_address"),
    consumerUserAgent: text("consumer_user_agent"),

    ...timestamps(),
  },

  (t) => [
    index("share_link_token_idx").on(t.token),
    index("share_link_status_idx").on(t.status),
    index("share_link_expires_at_idx").on(t.expiresAt),
    index("share_link_created_at_idx").on(t.createdAt),
    index("share_link_deleted_at_idx").on(t.deletedAt),
  ],
);

export const shareLinkRelations = relations(shareLink, ({ one }) => ({
  claimedByUser: one(user, {
    fields: [shareLink.claimedByUserId],
    references: [user.id],
  }),
}));
