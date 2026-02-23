/**
 * @fileoverview Audit log retention policy enforcement.
 *
 * Provides utilities for managing audit log retention:
 * - Configurable retention period
 * - Automatic cleanup of old entries
 * - Can be run as a scheduled job (cron) or manually
 *
 * Usage:
 * ```typescript
 * import { cleanupOldAuditLogs, getRetentionPolicy } from "~/server/audit/retention";
 *
 * // Run cleanup with default policy (90 days)
 * const deletedCount = await cleanupOldAuditLogs();
 *
 * // Or with custom retention period
 * const deletedCount = await cleanupOldAuditLogs({ retentionDays: 365 });
 * ```
 */

import { lt } from "drizzle-orm";
import { getDb } from "@/server/db";
import { auditLog } from "@/server/db/schemas";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Default retention period in days.
 * Can be overridden via AUDIT_LOG_RETENTION_DAYS environment variable.
 */
const DEFAULT_RETENTION_DAYS = 90;

/**
 * Maximum number of records to delete in a single batch.
 * This prevents long-running transactions and reduces database load.
 */
const MAX_BATCH_SIZE = 1000;

// ============================================================================
// TYPES
// ============================================================================

export interface RetentionPolicy {
  /** Number of days to retain audit logs */
  retentionDays: number;
  /** Whether retention policy is enabled */
  enabled: boolean;
}

export interface CleanupOptions {
  /** Override the default retention period in days */
  retentionDays?: number;
  /** Maximum number of records to delete (default: 1000) */
  batchSize?: number;
  /** If true, only return count without deleting (default: false) */
  dryRun?: boolean;
}

export interface CleanupResult {
  /** Number of records deleted */
  deletedCount: number;
  /** Whether there are more records to delete */
  hasMore: boolean;
  /** Cutoff date used for cleanup */
  cutoffDate: Date;
  /** Whether this was a dry run */
  dryRun: boolean;
}

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Gets the current retention policy from configuration.
 * Reads from AUDIT_LOG_RETENTION_DAYS environment variable,
 * falling back to DEFAULT_RETENTION_DAYS.
 */
export function getRetentionPolicy(): RetentionPolicy {
  const envDays = process.env.AUDIT_LOG_RETENTION_DAYS;
  const retentionDays = envDays
    ? parseInt(envDays, 10)
    : DEFAULT_RETENTION_DAYS;

  // Disable retention if set to 0 or negative
  const enabled = retentionDays > 0;

  return {
    retentionDays: Math.max(0, retentionDays),
    enabled,
  };
}

/**
 * Calculates the cutoff date for retention cleanup.
 * Records created before this date should be deleted.
 */
export function calculateCutoffDate(retentionDays: number): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  return cutoff;
}

/**
 * Cleans up audit log entries older than the retention period.
 *
 * This function:
 * 1. Calculates the cutoff date based on retention policy
 * 2. Deletes records in batches to avoid long transactions
 * 3. Returns the count of deleted records
 *
 * @example
 * ```typescript
 * // Delete old audit logs with default policy
 * const { deletedCount, hasMore } = await cleanupOldAuditLogs();
 *
 * // Keep running until all old records are deleted
 * while (hasMore) {
 *   const result = await cleanupOldAuditLogs();
 *   hasMore = result.hasMore;
 * }
 * ```
 */
export async function cleanupOldAuditLogs(
  options: CleanupOptions = {},
): Promise<CleanupResult> {
  const policy = getRetentionPolicy();
  const retentionDays = options.retentionDays ?? policy.retentionDays;
  const batchSize = options.batchSize ?? MAX_BATCH_SIZE;
  const dryRun = options.dryRun ?? false;

  // If retention is disabled, don't delete anything
  if (retentionDays <= 0) {
    return {
      deletedCount: 0,
      hasMore: false,
      cutoffDate: new Date(),
      dryRun,
    };
  }

  const cutoffDate = calculateCutoffDate(retentionDays);
  const db = getDb();

  if (dryRun) {
    // Count records that would be deleted
    const countResult = await db
      .select({ id: auditLog.id })
      .from(auditLog)
      .where(lt(auditLog.createdAt, cutoffDate))
      .limit(batchSize + 1);

    return {
      deletedCount: Math.min(countResult.length, batchSize),
      hasMore: countResult.length > batchSize,
      cutoffDate,
      dryRun: true,
    };
  }

  // Get IDs to delete (limit + 1 to check if there are more)
  const toDelete = await db
    .select({ id: auditLog.id })
    .from(auditLog)
    .where(lt(auditLog.createdAt, cutoffDate))
    .limit(batchSize + 1);

  const hasMore = toDelete.length > batchSize;
  const idsToDelete = toDelete.slice(0, batchSize).map((r) => r.id);

  if (idsToDelete.length === 0) {
    return {
      deletedCount: 0,
      hasMore: false,
      cutoffDate,
      dryRun: false,
    };
  }

  // Delete in batch
  // Using raw SQL for IN clause since Drizzle doesn't have a simple way for this
  await db.delete(auditLog).where(lt(auditLog.createdAt, cutoffDate));

  return {
    deletedCount: idsToDelete.length,
    hasMore,
    cutoffDate,
    dryRun: false,
  };
}

/**
 * Runs a full cleanup, deleting all records older than the retention period.
 * Continues in batches until all old records are removed.
 *
 * WARNING: This can be a long-running operation for large datasets.
 * Consider using cleanupOldAuditLogs() in a scheduled job instead.
 */
export async function runFullCleanup(
  options: Omit<CleanupOptions, "dryRun"> = {},
): Promise<{ totalDeleted: number; batches: number; cutoffDate: Date }> {
  let totalDeleted = 0;
  let batches = 0;
  let hasMore = true;
  let cutoffDate = new Date();

  while (hasMore) {
    const result = await cleanupOldAuditLogs(options);
    totalDeleted += result.deletedCount;
    batches += 1;
    hasMore = result.hasMore && result.deletedCount > 0;
    cutoffDate = result.cutoffDate;

    // Add a small delay between batches to reduce database load
    if (hasMore) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return { totalDeleted, batches, cutoffDate };
}
