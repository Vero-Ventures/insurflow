/**
 * @fileoverview Audit log schema for compliance and change tracking.
 *
 * Implements comprehensive audit logging following the requirements:
 * - Automatic change tracking for all entities (who changed what, when)
 * - Audit log entries: entity type, entity ID, action (create/update/delete), old values, new values
 * - User attribution (who made the change)
 * - IP address and user agent tracking
 * - Queryable audit history per entity
 * - Retention policy configuration
 */

import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { user } from "./auth-schema";
import { pgEnum } from "drizzle-orm/pg-core";

// ============================================================================
// AUDIT LOG ENUMS
// ============================================================================

/** Audit log action types */
export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
  "restore", // For soft-delete restoration
]);

/**
 * Entity types that can be audited.
 * Extend this enum as new entities are added to the system.
 */
export const auditEntityTypeEnum = pgEnum("audit_entity_type", [
  "client",
  "asset",
  "debt",
  "beneficiary",
  "asset_allocation",
  "business",
  "key_person",
  "shareholder",
  "corporate_insurance_need",
  "policy",
  "user_profile",
]);

// ============================================================================
// AUDIT LOG TABLE
// ============================================================================

/**
 * Audit log table for tracking all entity changes.
 *
 * Design decisions:
 * - No soft delete (audit logs are immutable, only purged by retention policy)
 * - Uses JSONB for old/new values to handle schema evolution
 * - Indexed for common query patterns (entity lookup, user lookup, time-based)
 * - User is nullable to handle system-initiated changes
 */
export const auditLog = pgTable(
  "audit_log",
  {
    /** Primary key */
    id: uuid("id").primaryKey().defaultRandom(),

    /** The type of entity being audited */
    entityType: auditEntityTypeEnum("entity_type").notNull(),

    /** The ID of the entity being audited */
    entityId: uuid("entity_id").notNull(),

    /** The action performed */
    action: auditActionEnum("action").notNull(),

    /** The user who performed the action (null for system changes) */
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),

    /** Previous values before the change (null for create) */
    oldValues: jsonb("old_values").$type<Record<string, unknown> | null>(),

    /** New values after the change (null for delete) */
    newValues: jsonb("new_values").$type<Record<string, unknown> | null>(),

    /** Changed fields for update operations */
    changedFields: jsonb("changed_fields").$type<string[] | null>(),

    /** IP address of the request (for security auditing) */
    ipAddress: text("ip_address"),

    /** User agent of the request (for security auditing) */
    userAgent: text("user_agent"),

    /** Request ID for correlation with observability logs */
    requestId: text("request_id"),

    /** Additional metadata (e.g., reason for change, batch operation ID) */
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),

    /** Timestamp of the change (immutable, no updatedAt) */
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    // Primary query pattern: lookup by entity
    index("audit_log_entity_type_entity_id_idx").on(t.entityType, t.entityId),

    // Secondary pattern: lookup by user
    index("audit_log_user_id_idx").on(t.userId),

    // Time-based queries (retention policy, recent changes)
    index("audit_log_created_at_idx").on(t.createdAt),

    // Composite index for entity history with time ordering
    index("audit_log_entity_type_entity_id_created_at_idx").on(
      t.entityType,
      t.entityId,
      t.createdAt,
    ),

    // Action-based filtering
    index("audit_log_action_idx").on(t.action),
  ],
);

// ============================================================================
// RELATIONS
// ============================================================================

/**
 * Audit log relations.
 * Links audit entries back to the user who made the change.
 */
export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(user, { fields: [auditLog.userId], references: [user.id] }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/** Inferred insert type for audit log entries */
export type AuditLogInsert = typeof auditLog.$inferInsert;

/** Inferred select type for audit log entries */
export type AuditLog = typeof auditLog.$inferSelect;

/** Audit action type literal */
export type AuditAction = (typeof auditActionEnum.enumValues)[number];

/** Audit entity type literal */
export type AuditEntityType = (typeof auditEntityTypeEnum.enumValues)[number];
