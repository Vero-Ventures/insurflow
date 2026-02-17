/**
 * @fileoverview Barrel export for all database schemas.
 *
 * This file re-exports all schemas from individual domain files to maintain
 * backward compatibility with existing imports from "~/server/db/schema".
 *
 * Schema Organization:
 * - enums-schema.ts: All pgEnum definitions
 * - auth-schema.ts: Better Auth tables (user, session, account, verification)
 * - clients-schema.ts: Client entity
 * - assets-schema.ts: Asset entity
 * - debts-schema.ts: Debt entity
 * - beneficiaries-schema.ts: Beneficiary & assetAllocation entities
 * - corporate-schema.ts: Business, keyPerson, shareholder, corporateInsuranceNeed
 */

import { relations } from "drizzle-orm";

// ============================================================================
// RE-EXPORT ALL ENUMS
// ============================================================================

export {
  stateEnum,
  sexEnum,
  healthRatingEnum,
  clientStatusEnum,
  assetTypeEnum,
  debtTypeEnum,
  beneficiaryRelationshipEnum,
  businessTypeEnum,
  insuranceNeedTypeEnum,
} from "./enums-schema";

// ============================================================================
// RE-EXPORT ALL TABLES
// ============================================================================

// Auth tables
export { user, session, account, verification } from "./auth-schema";

// Domain tables
export { client } from "./clients-schema";
export { asset } from "./assets-schema";
export { debt } from "./debts-schema";
export { beneficiary, assetAllocation } from "./beneficiaries-schema";
export {
  business,
  keyPerson,
  shareholder,
  corporateInsuranceNeed,
} from "./corporate-schema";

// ============================================================================
// RE-EXPORT RELATIONS FROM INDIVIDUAL SCHEMA FILES
// ============================================================================

// Auth relations
export { accountRelations, sessionRelations } from "./auth-schema";

// Domain relations
export { debtRelations } from "./debts-schema";
export {
  beneficiaryRelations,
  assetAllocationRelations,
} from "./beneficiaries-schema";
export {
  businessRelations,
  keyPersonRelations,
  shareholderRelations,
  corporateInsuranceNeedRelations,
} from "./corporate-schema";

// ============================================================================
// COMPLETE RELATIONS (Resolving cross-file dependencies)
// ============================================================================

// Import tables for relation definitions
import { user, account, session } from "./auth-schema";
import { client } from "./clients-schema";
import { asset } from "./assets-schema";
import { debt } from "./debts-schema";
import { beneficiary } from "./beneficiaries-schema";
import { business } from "./corporate-schema";
import { assetAllocation } from "./beneficiaries-schema";

/**
 * Complete user relations including clients.
 * Extends the base auth relations to include domain entities.
 */
export const userRelations = relations(user, ({ many }) => ({
  account: many(account),
  session: many(session),
  clients: many(client),
}));

/**
 * Complete client relations with all child entities.
 * Links clients to assets, debts, beneficiaries, and businesses.
 */
export const clientRelations = relations(client, ({ one, many }) => ({
  user: one(user, { fields: [client.userId], references: [user.id] }),
  assets: many(asset),
  debts: many(debt),
  beneficiaries: many(beneficiary),
  businesses: many(business),
}));

/**
 * Complete asset relations including allocations.
 * Links assets back to clients and to beneficiary allocations.
 */
export const assetRelations = relations(asset, ({ one, many }) => ({
  client: one(client, { fields: [asset.clientId], references: [client.id] }),
  allocations: many(assetAllocation),
}));
