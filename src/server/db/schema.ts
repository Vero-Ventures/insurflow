import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
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
    id: uuid("id").primaryKey().defaultRandom(),

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
    id: uuid("id").primaryKey().defaultRandom(),

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

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
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
// BUSINESS OWNERSHIP MODELING (Issue #146, PRD §3)
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
  beneficiaries: many(beneficiary),
  businesses: many(business),
}));

export const assetRelations = relations(asset, ({ one, many }) => ({
  client: one(client, { fields: [asset.clientId], references: [client.id] }),
  allocations: many(assetAllocation),
}));

export const debtRelations = relations(debt, ({ one }) => ({
  client: one(client, { fields: [debt.clientId], references: [client.id] }),
}));

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
