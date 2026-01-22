import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  pgTableCreator,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => `pg-drizzle_${name}`);

// ============================================================================
// ENUMS
// ============================================================================

/** Canadian provinces and territories */
export const provinceEnum = pgEnum("province", [
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

export const session = pgTable("session", {
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
});

export const account = pgTable("account", {
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
});

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
    province: provinceEnum("province").notNull(),
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
  ],
);

// ============================================================================
// LEGACY TABLES (to be removed)
// ============================================================================

export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 256 }),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => user.id),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("created_by_idx").on(t.createdById),
    index("name_idx").on(t.name),
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

export const clientRelations = relations(client, ({ one }) => ({
  user: one(user, { fields: [client.userId], references: [user.id] }),
}));
