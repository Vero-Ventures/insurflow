/**
 * @fileoverview Audit logging service for compliance and change tracking.
 *
 * Provides utilities for recording entity changes with full attribution:
 * - User ID, IP address, user agent
 * - Old/new values with diff detection
 * - Request correlation via request ID
 *
 * Usage:
 * ```typescript
 * import { createAuditLogger } from "~/server/audit";
 *
 * const audit = createAuditLogger({
 *   userId: session.user.id,
 *   ipAddress: request.headers.get("x-forwarded-for"),
 *   userAgent: request.headers.get("user-agent"),
 *   requestId: request.headers.get("x-request-id"),
 * });
 *
 * await audit.logCreate("client", newClient.id, newClient);
 * await audit.logUpdate("client", client.id, oldClient, newClient);
 * await audit.logDelete("client", client.id, oldClient);
 * ```
 */

import { getDb } from "@/server/db";
import {
  auditLog,
  type AuditEntityType,
  type AuditLogInsert,
} from "@/server/db/schemas";

// ============================================================================
// TYPES
// ============================================================================

/** Context for audit logging */
export interface AuditContext {
  /** User who performed the action (null for system changes) */
  userId?: string | null;
  /** Client IP address */
  ipAddress?: string | null;
  /** Client user agent */
  userAgent?: string | null;
  /** Request ID for correlation */
  requestId?: string | null;
}

/** Additional metadata for audit entries */
export interface AuditMetadata {
  /** Reason for the change (e.g., "User requested deletion") */
  reason?: string;
  /** Batch operation ID for bulk changes */
  batchId?: string;
  /** Source of the change (e.g., "api", "import", "migration") */
  source?: string;
  /** Any additional context */
  [key: string]: unknown;
}

/** Options for logging operations */
export interface AuditLogOptions {
  /** Additional metadata to include */
  metadata?: AuditMetadata;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Detects which fields changed between two objects.
 * Performs shallow comparison of top-level keys.
 */
export function detectChangedFields(
  oldValues: Record<string, unknown> | null | undefined,
  newValues: Record<string, unknown> | null | undefined,
): string[] {
  if (!oldValues || !newValues) return [];

  const changedFields: string[] = [];
  const allKeys = new Set([
    ...Object.keys(oldValues),
    ...Object.keys(newValues),
  ]);

  for (const key of allKeys) {
    const oldValue = oldValues[key];
    const newValue = newValues[key];

    // Skip internal fields that shouldn't be tracked
    if (key === "updatedAt") continue;

    // Compare values (handles primitives, null, undefined)
    if (!isEqual(oldValue, newValue)) {
      changedFields.push(key);
    }
  }

  return changedFields;
}

/**
 * Simple equality check for values.
 * Handles primitives, null, undefined, dates, and shallow object comparison.
 */
function isEqual(a: unknown, b: unknown): boolean {
  // Handle null/undefined
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;

  // Handle dates
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Handle objects (shallow comparison)
  if (typeof a === "object" && typeof b === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  return a === b;
}

/**
 * Sanitizes entity data for storage in audit logs.
 * Removes sensitive fields and converts non-serializable values.
 */
export function sanitizeForAudit(
  data: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!data) return null;

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    // Skip sensitive fields
    if (key.toLowerCase().includes("password")) continue;
    if (key.toLowerCase().includes("secret")) continue;
    if (key.toLowerCase().includes("token")) continue;

    // Convert dates to ISO strings
    if (value instanceof Date) {
      sanitized[key] = value.toISOString();
    } else if (value !== undefined) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// ============================================================================
// AUDIT LOGGER CLASS
// ============================================================================

/**
 * Audit logger instance for recording entity changes.
 */
export class AuditLogger {
  private context: AuditContext;

  constructor(context: AuditContext = {}) {
    this.context = context;
  }

  /**
   * Updates the audit context (e.g., when user is authenticated mid-request).
   */
  setContext(context: Partial<AuditContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Logs a create action.
   */
  async logCreate(
    entityType: AuditEntityType,
    entityId: string,
    newValues: Record<string, unknown>,
    options?: AuditLogOptions,
  ): Promise<void> {
    await this.log({
      entityType,
      entityId,
      action: "create",
      oldValues: null,
      newValues: sanitizeForAudit(newValues),
      changedFields: null,
      metadata: options?.metadata,
    });
  }

  /**
   * Logs an update action with automatic change detection.
   */
  async logUpdate(
    entityType: AuditEntityType,
    entityId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    options?: AuditLogOptions,
  ): Promise<void> {
    const sanitizedOld = sanitizeForAudit(oldValues);
    const sanitizedNew = sanitizeForAudit(newValues);
    const changedFields = detectChangedFields(sanitizedOld, sanitizedNew);

    // Skip logging if nothing actually changed
    if (changedFields.length === 0) return;

    await this.log({
      entityType,
      entityId,
      action: "update",
      oldValues: sanitizedOld,
      newValues: sanitizedNew,
      changedFields,
      metadata: options?.metadata,
    });
  }

  /**
   * Logs a delete action.
   */
  async logDelete(
    entityType: AuditEntityType,
    entityId: string,
    oldValues: Record<string, unknown>,
    options?: AuditLogOptions,
  ): Promise<void> {
    await this.log({
      entityType,
      entityId,
      action: "delete",
      oldValues: sanitizeForAudit(oldValues),
      newValues: null,
      changedFields: null,
      metadata: options?.metadata,
    });
  }

  /**
   * Logs a restore action (for soft-delete recovery).
   */
  async logRestore(
    entityType: AuditEntityType,
    entityId: string,
    restoredValues: Record<string, unknown>,
    options?: AuditLogOptions,
  ): Promise<void> {
    await this.log({
      entityType,
      entityId,
      action: "restore",
      oldValues: null,
      newValues: sanitizeForAudit(restoredValues),
      changedFields: null,
      metadata: options?.metadata,
    });
  }

  /**
   * Internal method to write audit log entry.
   */
  private async log(
    entry: Omit<
      AuditLogInsert,
      "userId" | "ipAddress" | "userAgent" | "requestId"
    >,
  ): Promise<void> {
    const db = getDb();

    const auditEntry: AuditLogInsert = {
      ...entry,
      userId: this.context.userId ?? null,
      ipAddress: this.context.ipAddress ?? null,
      userAgent: this.context.userAgent ?? null,
      requestId: this.context.requestId ?? null,
    };

    try {
      await db.insert(auditLog).values(auditEntry);
    } catch (error) {
      // Log error but don't throw - audit logging should not break the main operation
      console.error("[AuditLogger] Failed to write audit log:", error);
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Creates an audit logger with the given context.
 *
 * @example
 * ```typescript
 * const audit = createAuditLogger({
 *   userId: session.user.id,
 *   ipAddress: getClientIp(request),
 *   userAgent: request.headers.get("user-agent"),
 *   requestId: request.headers.get("x-request-id"),
 * });
 * ```
 */
export function createAuditLogger(context?: AuditContext): AuditLogger {
  return new AuditLogger(context);
}

// ============================================================================
// REQUEST HELPERS
// ============================================================================

/**
 * Extracts audit context from a Next.js request.
 */
export function extractAuditContext(
  request: Request,
  userId?: string | null,
): AuditContext {
  return {
    userId,
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
    requestId: request.headers.get("x-request-id"),
  };
}

/**
 * Gets the client IP address from request headers.
 * Handles various proxy headers used by Vercel, Cloudflare, etc.
 */
export function getClientIp(request: Request): string | null {
  // Vercel
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs; first one is the client
    const firstIp = forwardedFor.split(",")[0];
    return firstIp?.trim() ?? null;
  }

  // Cloudflare
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp;

  // Vercel specific
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  return null;
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export {
  getRetentionPolicy,
  calculateCutoffDate,
  cleanupOldAuditLogs,
  runFullCleanup,
  type RetentionPolicy,
  type CleanupOptions,
  type CleanupResult,
} from "./retention";
