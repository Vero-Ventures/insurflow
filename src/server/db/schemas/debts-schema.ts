/**
 * @fileoverview Debt entity schema for tracking client liabilities.
 *
 * MVP-lite version with fields required for debt payoff calculations.
 * Can be extended later with interest rate, payment schedule, insurable value, etc.
 */

import { relations } from "drizzle-orm";
import { decimal, index, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { client } from "./clients-schema";
import { debtTypeEnum } from "./enums-schema";
import { primaryId, timestamps } from "./schema-helpers";

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
    id: primaryId(),

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

    ...timestamps(),
  },
  (t) => [
    index("debt_client_id_idx").on(t.clientId),
    index("debt_type_idx").on(t.type),
    // Composite index for client's non-deleted debts
    index("debt_client_id_deleted_at_idx").on(t.clientId, t.deletedAt),
  ],
);

// ============================================================================
// DEBT RELATIONS
// ============================================================================

export const debtRelations = relations(debt, ({ one }) => ({
  client: one(client, { fields: [debt.clientId], references: [client.id] }),
}));
