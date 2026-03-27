/*
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
 * - d2c-resume-link-schema.ts: D2C resume link for save/resume functionality
 * - applications-schema.ts: D2C application lifecycle (application + applicationEvent)
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
  householdStatusEnum,
  primaryGoalEnum,
  communicationPreferenceEnum,
  accountTypeEnum,
  assetTypeEnum,
  debtTypeEnum,
  beneficiaryRelationshipEnum,
  businessTypeEnum,
  insuranceNeedTypeEnum,
  policyTypeEnum,
  policyStatusEnum,
  applicationStatusEnum,
  lifeEventTypeEnum,
} from "./enums-schema";

// Audit log enums
export { auditActionEnum, auditEntityTypeEnum } from "./audit-logs-schema";

// ============================================================================
// RE-EXPORT ALL TABLES
// ============================================================================

// Auth tables
export { user, session, account, verification } from "./auth-schema";
export { userProfile } from "./user-profile-schema";

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
export { policy } from "./policies-schema";
export { auditLog } from "./audit-logs-schema";

// D2C tables
export { d2cResumeLink } from "./d2c-resume-link-schema";
export { estimateRun } from "./d2c-estimate-run-schema";
export { application, applicationEvent } from "./applications-schema";

// Webhook event tables
export { webhookEvent } from "./webhook-events-schema";

// Life event tables
export { lifeEventRecalculation } from "./life-events-schema";

// ============================================================================
// RE-EXPORT RELATIONS FROM INDIVIDUAL SCHEMA FILES
// ============================================================================

// Auth relations
export { accountRelations, sessionRelations } from "./auth-schema";
export { userProfileRelations } from "./user-profile-schema";

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
export { policyRelations } from "./policies-schema";
export { auditLogRelations } from "./audit-logs-schema";

// D2C relations
export { d2cResumeLinkRelations } from "./d2c-resume-link-schema";
export { estimateRunRelations } from "./d2c-estimate-run-schema";

// Application relations
export {
  applicationRelations,
  applicationEventRelations,
} from "./applications-schema";

// Webhook event relations
export { webhookEventRelations } from "./webhook-events-schema";

// Life event relations
export { lifeEventRecalculationRelations } from "./life-events-schema";

// D2C types
export type {
  D2cResumeLink,
  D2cResumeLinkInsert,
} from "./d2c-resume-link-schema";

// Estimate run types
export type {
  EstimateRun,
  EstimateRunInsert,
} from "./d2c-estimate-run-schema";

// Application types
export type {
  Application,
  ApplicationInsert,
  ApplicationEvent,
  ApplicationEventInsert,
  ApplicationStatus,
} from "./applications-schema";

// Audit log types
export type {
  AuditLog,
  AuditLogInsert,
  AuditAction,
  AuditEntityType,
} from "./audit-logs-schema";

// Webhook event types
export type { WebhookEvent, WebhookEventInsert } from "./webhook-events-schema";

// Life event types
export type {
  LifeEventRecalculation,
  LifeEventRecalculationInsert,
  LifeEventType,
  InsuranceNeedsSnapshot,
} from "./life-events-schema";

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
import { userProfile } from "./user-profile-schema";
import { policy } from "./policies-schema";
import { d2cResumeLink } from "./d2c-resume-link-schema";
import { estimateRun } from "./d2c-estimate-run-schema";
import { application } from "./applications-schema";
import { webhookEvent } from "./webhook-events-schema";
import { lifeEventRecalculation } from "./life-events-schema";

/**
 * Complete user relations including clients.
 * Extends the base auth relations to include domain entities.
 */
export const userRelations = relations(user, ({ many, one }) => ({
  account: many(account),
  session: many(session),
  clients: many(client),
  profile: one(userProfile, {
    fields: [user.id],
    references: [userProfile.userId],
  }),
  d2cResumeLinks: many(d2cResumeLink),
  applications: many(application),
  lifeEventRecalculations: many(lifeEventRecalculation),
}));

/**
 * Complete client relations with all child entities.
 * Links clients to assets, debts, beneficiaries, businesses, policies, D2C resume links, and applications.
 */
export const clientRelations = relations(client, ({ one, many }) => ({
  user: one(user, { fields: [client.userId], references: [user.id] }),
  assets: many(asset),
  debts: many(debt),
  beneficiaries: many(beneficiary),
  businesses: many(business),
  policies: many(policy),
  d2cResumeLinks: many(d2cResumeLink),
  applications: many(application),
  estimateRuns: many(estimateRun),
  webhookEvents: many(webhookEvent),
  lifeEventRecalculations: many(lifeEventRecalculation),
}));

/**
 * Complete asset relations including allocations.
 * Links assets back to clients and to beneficiary allocations.
 */
export const assetRelations = relations(asset, ({ one, many }) => ({
  client: one(client, { fields: [asset.clientId], references: [client.id] }),
  allocations: many(assetAllocation),
}));
