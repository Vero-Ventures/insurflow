import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ============================================================================
// ENUMS
// ============================================================================

/** US states and District of Columbia */
export const stateEnum = pgEnum("state", [
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
]);

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

/** Client status in the system */
export const clientStatusEnum = pgEnum("client_status", [
  "draft",
  "active",
  "archived",
]);

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
// AUTH TABLES (Better Auth)
// ============================================================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    // Index for looking up sessions by user (auth checks, session listing)
    index("session_user_id_idx").on(t.userId),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (t) => [
    // Index for looking up accounts by user
    index("account_user_id_idx").on(t.userId),
    // Unique constraint to prevent duplicate OAuth accounts (same provider + account combo)
    uniqueIndex("account_provider_account_idx").on(t.providerId, t.accountId),
  ],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});

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
    id: uuid("id").primaryKey().defaultRandom(),

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

    /** Additional goals or notes (informational only) */
    additionalGoals: text("additional_goals"),

    // -------------------------------------------------------------------------
    // Status
    // -------------------------------------------------------------------------
    status: clientStatusEnum("status").notNull().default("draft"),

    // -------------------------------------------------------------------------
    // Timestamps
    // -------------------------------------------------------------------------
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
    index("client_user_id_idx").on(t.userId),
    index("client_status_idx").on(t.status),
    index("client_deleted_at_idx").on(t.deletedAt),
    // Composite index for the most common query pattern: user's non-deleted clients
    index("client_user_id_deleted_at_idx").on(t.userId, t.deletedAt),
  ],
);

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
// DEBT ENTITY (Issue #54)
// ============================================================================

/**
 * Debt entity for tracking client liabilities.
 *
 * MVP-lite version with fields required for debt payoff calculations.
 * Can be extended later with interest rate, payment schedule, insurable value, etc.
 */
export const debt = pgTable(
  "debt",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Ownership - links debt to the client
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id, { onDelete: "cascade" }),

    // Debt details
    name: text("name").notNull(),
    type: debtTypeEnum("type").notNull(),

    /** Current outstanding balance in CAD */
    currentBalance: decimal("current_balance", { precision: 14, scale: 2 })
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
    index("debt_client_id_idx").on(t.clientId),
    index("debt_type_idx").on(t.type),
    // Composite index for client's non-deleted debts
    index("debt_client_id_deleted_at_idx").on(t.clientId, t.deletedAt),
  ],
);

// ============================================================================
// RELATIONS
// ============================================================================

export const userRelations = relations(user, ({ many }) => ({
  account: many(account),
  session: many(session),
  clients: many(client),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const clientRelations = relations(client, ({ one, many }) => ({
  user: one(user, { fields: [client.userId], references: [user.id] }),
  assets: many(asset),
  debts: many(debt),
}));

export const assetRelations = relations(asset, ({ one }) => ({
  client: one(client, { fields: [asset.clientId], references: [client.id] }),
}));

export const debtRelations = relations(debt, ({ one }) => ({
  client: one(client, { fields: [debt.clientId], references: [client.id] }),
}));
