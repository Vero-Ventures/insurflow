/**
 * @fileoverview D2C Draft helper functions.
 *
 * Provides CRUD operations for D2C draft client records. Authenticated
 * consumers can create, retrieve, and update draft applications that
 * persist across sessions and devices.
 *
 * Design decisions:
 * - A user may only have ONE active draft at a time (simplifies UX).
 * - "Active draft" = status "draft", not soft-deleted.
 * - Create is idempotent: if a draft already exists, it is returned.
 * - Update is partial: only provided fields are overwritten.
 */

import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/server/db";
import { client } from "@/server/db/schemas";
import type { ClientDraftFields } from "@/lib/d2c/client-adapter";

/** Drizzle insert type for the client table. */
type ClientInsert = typeof client.$inferInsert;

// ============================================================================
// Types
// ============================================================================

/** Columns returned when reading a draft. */
const DRAFT_SELECT_COLUMNS = {
  id: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  sex: true,
  state: true, // DB column; mapped to `province` in DraftClientRecord
  smoker: true,
  healthRating: true,
  clientIncome: true,
  existingLifeInsuranceCoverage: true,
  replacementDurationYears: true,
  hasSpouse: true,
  spouseAge: true,
  youngestChildAge: true,
  additionalGoals: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * The shape returned by draft queries.
 * Uses `province` semantically (Canada-only app), though the DB column is `state`.
 */
export type DraftClientRecord = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: "M" | "F";
  province: string;
  smoker: boolean;
  healthRating: string;
  clientIncome: string;
  existingLifeInsuranceCoverage: string;
  replacementDurationYears: number;
  hasSpouse: boolean;
  spouseAge: number | null;
  youngestChildAge: number | null;
  additionalGoals: string | null;
  status: "draft" | "active" | "archived";
  createdAt: Date;
  updatedAt: Date;
};

/** Raw DB record shape (uses `state` column name). */
type DbClientRecord = Omit<DraftClientRecord, "province"> & { state: string };

/**
 * Transforms a raw DB client record to the DraftClientRecord shape.
 * Maps the `state` DB column to the `province` interface field.
 */
function toDraftClientRecord(dbRecord: DbClientRecord): DraftClientRecord {
  const { state, ...rest } = dbRecord;
  return { ...rest, province: state };
}

// ============================================================================
// Find latest draft
// ============================================================================

export interface FindDraftSuccess {
  found: true;
  draft: DraftClientRecord;
}

export interface FindDraftNotFound {
  found: false;
}

/**
 * Finds the most recent active draft for a user.
 *
 * Returns the most recently updated non-deleted client with status "draft"
 * owned by the given userId, or `{ found: false }` if none exists.
 */
export async function findLatestDraft(
  userId: string,
): Promise<FindDraftSuccess | FindDraftNotFound> {
  const db = getDb();

  const draft = await db.query.client.findFirst({
    where: and(
      eq(client.userId, userId),
      eq(client.status, "draft"),
      isNull(client.deletedAt),
    ),
    columns: DRAFT_SELECT_COLUMNS,
    orderBy: [desc(client.updatedAt), desc(client.createdAt)],
  });

  if (!draft) {
    return { found: false };
  }

  return {
    found: true,
    draft: toDraftClientRecord(draft as unknown as DbClientRecord),
  };
}

/**
 * Finds a specific draft by client ID and user ID.
 *
 * Returns the draft only if it is owned by the given userId,
 * has status "draft", and is not soft-deleted.
 */
export async function findDraftById(
  clientId: string,
  userId: string,
): Promise<FindDraftSuccess | FindDraftNotFound> {
  const db = getDb();

  const draft = await db.query.client.findFirst({
    where: and(
      eq(client.id, clientId),
      eq(client.userId, userId),
      eq(client.status, "draft"),
      isNull(client.deletedAt),
    ),
    columns: DRAFT_SELECT_COLUMNS,
  });

  if (!draft) {
    return { found: false };
  }

  return {
    found: true,
    draft: toDraftClientRecord(draft as unknown as DbClientRecord),
  };
}

// ============================================================================
// Create draft
// ============================================================================

export interface CreateDraftSuccess {
  success: true;
  draft: DraftClientRecord;
  existed: boolean;
}

export interface CreateDraftError {
  success: false;
  errorCode: "INSERT_FAILED";
  message: string;
}

/**
 * Default values for a new draft client record.
 *
 * These satisfy the NOT NULL constraints on the client table while
 * clearly signalling "not yet filled in" to the adapter layer.
 *
 * Note: Uses "NY" as temporary default until DB enum is updated
 * to include Canadian provinces (app is transitioning to Canada-only).
 */
const DRAFT_DEFAULTS = {
  firstName: "",
  lastName: "",
  dateOfBirth: "2000-01-01",
  sex: "M" as const,
  state: "NY" as const, // Temporary default (DB enum lacks Canadian provinces)
  smoker: false,
  healthRating: "standard" as const,
  clientIncome: "0",
  existingLifeInsuranceCoverage: "0",
  replacementDurationYears: 20,
  status: "draft" as const,
};

function activeDraftPredicateByUser(userId: string) {
  return and(
    eq(client.userId, userId),
    eq(client.status, "draft"),
    isNull(client.deletedAt),
  );
}

function activeDraftPredicateById(clientId: string, userId: string) {
  return and(eq(client.id, clientId), activeDraftPredicateByUser(userId));
}

/**
 * Creates a new draft client or returns the existing one.
 *
 * Idempotent: if the user already has an active draft, it is returned
 * with `existed: true` instead of creating a duplicate.
 *
 * @param userId - The authenticated user's ID
 * @param initialFields - Optional partial fields to populate on creation
 */
export async function createDraft(
  userId: string,
  initialFields?: Partial<ClientDraftFields>,
): Promise<CreateDraftSuccess | CreateDraftError> {
  const db = getDb();

  const values = {
    userId,
    ...DRAFT_DEFAULTS,
    ...toDbFields(stripUndefined(initialFields ?? {})),
  } as ClientInsert;

  let result:
    | { existed: boolean; draft: unknown }
    | { error: "INSERT_FAILED" | "RETRIEVE_FAILED" };

  try {
    const [inserted] = await db
      .insert(client)
      .values(values)
      .onConflictDoNothing()
      .returning();

    if (inserted) {
      const draft = await db.query.client.findFirst({
        where: activeDraftPredicateById(inserted.id, userId),
        columns: DRAFT_SELECT_COLUMNS,
      });

      if (!draft) {
        console.error("[createDraft] Insert succeeded but re-fetch failed", {
          userId,
          insertedId: inserted.id,
        });
        result = { error: "RETRIEVE_FAILED" };
      } else {
        result = { existed: false, draft };
      }
    } else {
      console.info(
        "[createDraft] Insert conflicted; returning existing draft",
        {
          userId,
        },
      );
      const existing = await db.query.client.findFirst({
        where: activeDraftPredicateByUser(userId),
        columns: DRAFT_SELECT_COLUMNS,
        orderBy: [desc(client.updatedAt), desc(client.createdAt)],
      });

      if (existing) {
        result = { existed: true, draft: existing };
      } else {
        console.error("[createDraft] Conflict without retrievable draft", {
          userId,
        });
        result = { error: "INSERT_FAILED" };
      }
    }
  } catch (error) {
    console.error("[createDraft] Upsert path failed", {
      userId,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : String(error),
    });
    result = { error: "INSERT_FAILED" };
  }

  if (!result || "error" in result) {
    return {
      success: false,
      errorCode: "INSERT_FAILED",
      message:
        result && "error" in result && result.error === "RETRIEVE_FAILED"
          ? "Draft was created but could not be retrieved"
          : "Failed to create draft client record",
    };
  }

  return {
    success: true,
    draft: toDraftClientRecord(result.draft as unknown as DbClientRecord),
    existed: result.existed,
  };
}

// ============================================================================
// Update draft
// ============================================================================

export interface UpdateDraftSuccess {
  success: true;
  draft: DraftClientRecord;
}

export interface UpdateDraftError {
  success: false;
  errorCode: "NOT_FOUND" | "NOT_DRAFT" | "NO_FIELDS";
  message: string;
}

/**
 * Updates an existing draft client with partial field values.
 *
 * Security checks:
 * - Client must exist and not be soft-deleted
 * - Client must be owned by the requesting user
 * - Client must still be in "draft" status
 *
 * @param clientId - The client record ID
 * @param userId - The authenticated user's ID (ownership check)
 * @param fields - Partial fields to update
 */
export async function updateDraft(
  clientId: string,
  userId: string,
  fields: Partial<ClientDraftFields>,
): Promise<UpdateDraftSuccess | UpdateDraftError> {
  const cleanFields = stripUndefined(fields);

  // Remove status from update payload — status transitions are explicit
  delete (cleanFields as Record<string, unknown>).status;

  if (Object.keys(cleanFields).length === 0) {
    return {
      success: false,
      errorCode: "NO_FIELDS",
      message: "No fields provided for update",
    };
  }

  const db = getDb();

  // Transform province -> state for DB column naming
  const dbFields = toDbFields(cleanFields);

  // Atomic ownership + status check via WHERE clause (TOCTOU safe)
  const [updated] = await db
    .update(client)
    .set({ ...dbFields, updatedAt: new Date() } as Partial<ClientInsert>)
    .where(
      and(
        eq(client.id, clientId),
        eq(client.userId, userId),
        eq(client.status, "draft"),
        isNull(client.deletedAt),
      ),
    )
    .returning();

  if (!updated) {
    // Determine the specific failure reason for better error messages
    const existing = await db.query.client.findFirst({
      where: and(eq(client.id, clientId), isNull(client.deletedAt)),
      columns: { id: true, userId: true, status: true },
    });

    if (!existing || existing.userId !== userId) {
      return {
        success: false,
        errorCode: "NOT_FOUND",
        message: "Draft not found or you do not have access",
      };
    }

    if (existing.status !== "draft") {
      return {
        success: false,
        errorCode: "NOT_DRAFT",
        message: "Client is no longer in draft status",
      };
    }

    // Shouldn't reach here, but handle gracefully
    return {
      success: false,
      errorCode: "NOT_FOUND",
      message: "Draft not found",
    };
  }

  // Re-fetch with consistent column set
  const draft = await db.query.client.findFirst({
    where: eq(client.id, updated.id),
    columns: DRAFT_SELECT_COLUMNS,
  });

  return {
    success: true,
    draft: toDraftClientRecord(draft as unknown as DbClientRecord),
  };
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Removes keys with `undefined` values from an object.
 * Drizzle treats `undefined` differently from absent keys.
 */
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as Partial<T>;
}

/**
 * Transforms ClientDraftFields (uses `province`) to DB column names (uses `state`).
 * This handles the semantic mismatch between the interface and DB schema.
 */
function toDbFields(
  fields: Partial<ClientDraftFields>,
): Record<string, unknown> {
  const { province, ...rest } = fields;
  const result: Record<string, unknown> = { ...rest };
  if (province !== undefined) {
    result.state = province;
  }
  return result;
}
