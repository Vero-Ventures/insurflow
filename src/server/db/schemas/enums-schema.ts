/**
 * @fileoverview Enumeration definitions for the InsurFlow database schema.
 *
 * Contains all pgEnum definitions used across the application including:
 * - Geographic enums (US states)
 * - Insurance underwriting enums (sex, health rating)
 * - Entity status enums (client status)
 * - Asset and debt classification enums
 * - Relationship enums (beneficiary relationships)
 * - Business enums (business type, insurance need type)
 */

import { pgEnum } from "drizzle-orm/pg-core";

// ============================================================================
// GEOGRAPHIC ENUMS
// ============================================================================

/** US states, District of Columbia, and Canadian provinces/territories */
export const stateEnum = pgEnum("state", [
  // US states
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
  // Canadian provinces and territories
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
]);

// ============================================================================
// INSURANCE UNDERWRITING ENUMS
// ============================================================================

/** Biological sex for insurance underwriting */
export const sexEnum = pgEnum("sex", ["M", "F"]);

/** Health rating for insurance classification */
export const healthRatingEnum = pgEnum("health_rating", [
  "preferred_plus",
  "preferred",
  "standard_plus",
  "standard",
  "substandard",
]);

// ============================================================================
// CLIENT STATUS ENUMS
// ============================================================================

/** Client status in the system */
export const clientStatusEnum = pgEnum("client_status", [
  "draft",
  "active",
  "archived",
]);

/** Onboarding household status */
export const householdStatusEnum = pgEnum("household_status", [
  "single",
  "partnered",
  "family",
]);

/** Onboarding primary goal */
export const primaryGoalEnum = pgEnum("primary_goal", [
  "family_protection",
  "debt_coverage",
  "retirement_security",
  "estate_planning",
]);

/** Onboarding communication preference */
export const communicationPreferenceEnum = pgEnum("communication_preference", [
  "email",
  "phone",
  "sms",
]);

/** Onboarding account type */
export const accountTypeEnum = pgEnum("account_type", ["client", "advisor"]);

// ============================================================================
// ASSET & DEBT ENUMS
// ============================================================================

/** Asset type classification (US market) */
export const assetTypeEnum = pgEnum("asset_type", [
  "401k",
  "403b",
  "ira_traditional",
  "ira_roth",
  "sep_ira",
  "simple_ira",
  "brokerage",
  "hsa",
  "529_plan",
  "real_estate",
  "life_insurance",
  "business_interest",
  "pension",
  "stock_options",
  "cryptocurrency",
  "collectibles",
  "savings",
  "other",
]);

/** Debt type classification */
export const debtTypeEnum = pgEnum("debt_type", [
  "mortgage",
  "heloc",
  "car_loan",
  "student_loan",
  "personal_loan",
  "credit_card",
  "line_of_credit",
  "business_loan",
  "other",
]);

// ============================================================================
// RELATIONSHIP ENUMS
// ============================================================================

/** Beneficiary relationship types */
export const beneficiaryRelationshipEnum = pgEnum("beneficiary_relationship", [
  "spouse",
  "child",
  "parent",
  "sibling",
  "grandchild",
  "grandparent",
  "trust",
  "charity",
  "estate",
  "business_partner",
  "other",
]);

// ============================================================================
// BUSINESS ENUMS
// ============================================================================

/** Business entity type classification */
export const businessTypeEnum = pgEnum("business_type", [
  "corporation",
  "partnership",
  "sole_proprietorship",
  "trust",
  "other",
]);

/** Corporate insurance need type classification */
export const insuranceNeedTypeEnum = pgEnum("insurance_need_type", [
  "key_person",
  "buy_sell",
  "debt_coverage",
  "succession",
  "other",
]);

// ============================================================================
// APPLICATION STATUS ENUMS
// ============================================================================

/**
 * D2C application lifecycle status (provider-agnostic).
 * Covers the full lifecycle from draft through carrier decision.
 *
 * States:
 * - draft: Application started but not submitted
 * - submitted: Sent to carrier, awaiting acknowledgment
 * - received: Carrier acknowledged receipt
 * - in_review: Under underwriting review
 * - additional_info_requested: Carrier needs more information
 * - approved: Application approved
 * - declined: Application declined
 */
export const applicationStatusEnum = pgEnum("application_status", [
  "draft",
  "submitted",
  "received",
  "in_review",
  "additional_info_requested",
  "approved",
  "declined",
]);

/** Background letter generation job lifecycle status */
export const letterGenerationJobStatusEnum = pgEnum("letter_job_status", [
  "queued",
  "processing",
  "completed",
  "failed",
]);

// ============================================================================
// LIFE EVENT ENUMS
// ============================================================================

/** Life event types that can trigger an insurance needs recalculation */
export const lifeEventTypeEnum = pgEnum("life_event_type", [
  "income_change",
  "new_child",
  "debt_change",
  "marriage",
  "divorce",
]);

// ============================================================================
// POLICY ENUMS
// ============================================================================

/** Life insurance policy type classification */
export const policyTypeEnum = pgEnum("policy_type", [
  "term_life",
  "whole_life",
  "universal_life",
  "variable_life",
  "group_life",
  "other",
]);

/** Policy status classification */
export const policyStatusEnum = pgEnum("policy_status", [
  "active",
  "lapsed",
  "surrendered",
  "paid_up",
  "pending",
]);
