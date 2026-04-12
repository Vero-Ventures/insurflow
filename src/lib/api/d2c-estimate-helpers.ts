/**
 * @fileoverview Shared estimate-run service helpers.
 *
 * Provides the core logic for running insurance estimates and persisting
 * them as immutable estimate_run records. Designed to be reusable across
 * both D2C and advisor flows (advisor flow deferred to post-v1).
 *
 * Responsibilities:
 * - Resolve or seed the current assumption version in the DB
 * - Run the insurance needs calculation engine
 * - Obtain a premium range estimate from the carrier provider
 * - Assemble and persist the estimate_run record
 * - Retrieve estimate run history for a client
 *
 * Design decisions:
 * - Pure service layer — no HTTP concerns (request/response/auth).
 * - Assumption version resolution uses a module-level cache to avoid
 *   repeated DB lookups within the same process lifetime.
 * - The estimate engine and provider are called inline (not injected)
 *   because there is currently one engine and one provider. When the
 *   advisor flow adds a second entry point, DI can be introduced.
 *
 * @see Issue #226
 */

import { isDeepStrictEqual } from "node:util";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { client } from "@/server/db/schemas";
import {
  assumptionVersion,
  estimateRun,
} from "@/server/db/schemas/estimate-runs-schema";
import type {
  AssumptionParameters,
  EstimateRun,
  EstimateRunInputs,
  EstimateRunOutputs,
  EstimateSource,
} from "@/server/db/schemas/estimate-runs-schema";
import { calculateInsuranceNeedsRounded } from "@/lib/financial/insurance-needs";
import { getMockPremiumRangeMonthly } from "@/lib/providers/mock-term-life-provider";
import {
  CURRENT_ASSUMPTION_VERSION,
  ESTIMATE_ENGINE_ID,
  ESTIMATE_ENGINE_VERSION,
} from "@/lib/d2c/estimate-assumptions";

// ============================================================================
// Types
// ============================================================================

/** Input required to execute an estimate run */
export interface RunEstimateInput {
  /** The user ID who is requesting the estimate */
  userId: string;
  /** The client ID this estimate belongs to. */
  clientId: string;
  /** Source context (d2c or advisor) */
  source: EstimateSource;
  /** Client's annual income in CAD */
  annualIncome: number;
  /** Age at time of estimate */
  age: number;
  /** Canadian province code */
  province: string;
  /** Tobacco use flag */
  tobaccoUse: boolean;
  /** Term length in years */
  termYears: number;
  /** User-selected coverage override (0 = use engine recommendation) */
  coverageAmountOverride: number;
}

/** Successful result of an estimate run */
export interface RunEstimateSuccess {
  success: true;
  /** Whether the latest persisted run was reused instead of inserting a new row. */
  reusedExisting: boolean;
  estimateRun: {
    id: string;
    runNumber: number;
    inputs: EstimateRunInputs;
    outputs: EstimateRunOutputs;
    assumptionVersionId: string;
    assumptionVersionLabel: string;
    engineId: string;
    engineVersion: string;
    providerKey: string;
    createdAt: Date;
  };
}

/** Failed result of an estimate run */
export interface RunEstimateError {
  success: false;
  errorCode:
    | "ASSUMPTION_SEED_FAILED"
    | "INSERT_FAILED"
    | "CLIENT_NOT_FOUND"
    | "CLIENT_NOT_DRAFT";
  message: string;
}

function getExecuteRows(
  result: unknown,
): Array<{ status?: string | null }> {
  if (Array.isArray(result)) {
    return result as Array<{ status?: string | null }>;
  }

  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows?: unknown[] }).rows)
  ) {
    return (result as { rows: Array<{ status?: string | null }> }).rows;
  }

  return [];
}

function isUniqueViolation(error: unknown): boolean {
  if (error instanceof Error) {
    if ("code" in error && (error as { code: string }).code === "23505") {
      return true;
    }
    if (error.message.includes("unique") || error.message.includes("23505")) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// Assumption Version Resolution
// ============================================================================

/**
 * Module-level cache for the resolved assumption version ID.
 * Avoids repeated DB lookups within the same process lifetime.
 * Keyed by version label since only one version is active at a time.
 */
let cachedAssumptionVersionId: string | null = null;
let cachedAssumptionVersionLabel: string | null = null;

/**
 * Resolves the current assumption version, seeding it into the DB if it
 * doesn't exist yet. Returns the DB record's UUID.
 *
 * @async
 * @returns The assumption version ID and label.
 * @throws Throws when DB insert fails unexpectedly.
 */
async function resolveAssumptionVersion(): Promise<{
  id: string;
  versionLabel: string;
}> {
  const currentDef = CURRENT_ASSUMPTION_VERSION;

  // Fast path: use cached ID if already resolved
  if (cachedAssumptionVersionId && cachedAssumptionVersionLabel) {
    return {
      id: cachedAssumptionVersionId,
      versionLabel: cachedAssumptionVersionLabel,
    };
  }

  const db = getDb();

  // Check if this version already exists
  const findExisting = async () =>
    db.query.assumptionVersion.findFirst({
      where: and(
        eq(assumptionVersion.versionLabel, currentDef.versionLabel),
        eq(assumptionVersion.productLine, currentDef.productLine),
      ),
      columns: { id: true, versionLabel: true },
    });

  const existing = await findExisting();

  if (existing) {
    cachedAssumptionVersionId = existing.id;
    cachedAssumptionVersionLabel = existing.versionLabel;
    return { id: existing.id, versionLabel: existing.versionLabel };
  }

  // Seed the assumption version into the DB
  let inserted;

  try {
    [inserted] = await db
      .insert(assumptionVersion)
      .values({
        versionLabel: currentDef.versionLabel,
        productLine: currentDef.productLine,
        effectiveFrom: currentDef.effectiveFrom,
        effectiveTo: currentDef.effectiveTo,
        parameters: currentDef.parameters,
        changeNotes: currentDef.changeNotes,
      })
      .returning();
  } catch (error) {
    if (isUniqueViolation(error)) {
      const racedExisting = await findExisting();
      if (racedExisting) {
        cachedAssumptionVersionId = racedExisting.id;
        cachedAssumptionVersionLabel = racedExisting.versionLabel;
        return {
          id: racedExisting.id,
          versionLabel: racedExisting.versionLabel,
        };
      }
    }

    throw error;
  }

  if (!inserted) {
    throw new Error("Failed to seed assumption version");
  }

  cachedAssumptionVersionId = inserted.id;
  cachedAssumptionVersionLabel = inserted.versionLabel;
  return { id: inserted.id, versionLabel: inserted.versionLabel };
}

/**
 * Clears the cached assumption version ID.
 * Exposed for testing — not intended for production use.
 */
export function clearAssumptionVersionCache(): void {
  cachedAssumptionVersionId = null;
  cachedAssumptionVersionLabel = null;
}

// ============================================================================
// Core Estimate Execution
// ============================================================================

/**
 * Executes a full estimate run and reuses the latest identical persisted row.
 *
 * @async
 * @param input - The estimate input parameters.
 * @returns The latest matching estimate run, a newly persisted run, or an error.
 */
export async function runEstimate(
  input: RunEstimateInput,
): Promise<RunEstimateSuccess | RunEstimateError> {
  // 1. Resolve assumption version (seed if needed)
  let versionInfo: { id: string; versionLabel: string };
  try {
    versionInfo = await resolveAssumptionVersion();
  } catch {
    return {
      success: false,
      errorCode: "ASSUMPTION_SEED_FAILED",
      message: "Failed to resolve assumption version",
    };
  }

  const params: AssumptionParameters = CURRENT_ASSUMPTION_VERSION.parameters;

  // 2. Build estate buffer config with proper type narrowing
  const estateBufferConfig =
    params.estateBuffer.type === "fixed"
      ? { type: "fixed" as const, amount: params.estateBuffer.value }
      : { type: "percentage" as const, percentage: params.estateBuffer.value };

  // 3. Run insurance needs calculation (pure, deterministic)
  const needsResult = calculateInsuranceNeedsRounded({
    clientIncome: input.annualIncome,
    spouseIncome: 0,
    includeSpouseIncome: false,
    incomeReplacementPercent: params.incomeReplacementPercent,
    replacementDurationYears: params.replacementDurationYears,
    existingLifeInsuranceCoverage: params.existingCoverageDefault,
    totalDebts: params.totalDebtsDefault,
    liquidAssets: params.liquidAssetsDefault,
    totalAssets: 0,
    estateBuffer: estateBufferConfig,
  });

  // 4. Determine coverage amount (user override or engine recommendation)
  const recommendedCoverage =
    input.coverageAmountOverride > 0
      ? input.coverageAmountOverride
      : needsResult.totalInsuranceNeeds;

  // 5. Get premium range estimate from provider (sync mock, async interface)
  const premiumRange = getMockPremiumRangeMonthly({
    age: input.age,
    tobaccoUse: input.tobaccoUse,
    province: input.province,
    termYears: input.termYears,
    coverageAmount: recommendedCoverage,
  });

  // 6. Assemble snapshots
  const inputs: EstimateRunInputs = {
    annualIncome: input.annualIncome,
    age: input.age,
    province: input.province,
    tobaccoUse: input.tobaccoUse,
    termYears: input.termYears,
    coverageAmount: recommendedCoverage,
    includeSpouseIncome: false,
    spouseIncome: 0,
  };

  const outputs: EstimateRunOutputs = {
    insuranceNeeds: {
      incomeReplacementNeeds: needsResult.incomeReplacementNeeds,
      debtPayoffNeeds: needsResult.debtPayoffNeeds,
      estateBufferNeeds: needsResult.estateBufferNeeds,
      grossNeeds: needsResult.grossNeeds,
      existingCoverage: needsResult.existingCoverage,
      liquidAssets: needsResult.liquidAssets,
      totalInsuranceNeeds: needsResult.totalInsuranceNeeds,
    },
    recommendedCoverage,
    premiumRange: {
      lowMonthlyPremiumCad: premiumRange.lowMonthlyPremiumCad,
      highMonthlyPremiumCad: premiumRange.highMonthlyPremiumCad,
      currency: "CAD",
      nonBinding: true,
    },
  };

  const db = getDb();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any).transaction(async (tx: any) => {
    const lockedClientRows = getExecuteRows(
      await tx.execute(sql`
        SELECT status
        FROM ${client}
        WHERE id = ${input.clientId}
          AND user_id = ${input.userId}
          AND deleted_at IS NULL
        FOR UPDATE
      `),
    );
    const lockedStatus = lockedClientRows[0]?.status;

    if (!lockedStatus) {
      return {
        success: false,
        errorCode: "CLIENT_NOT_FOUND",
        message: "Client draft not found",
      } satisfies RunEstimateError;
    }

    if (lockedStatus !== "draft") {
      return {
        success: false,
        errorCode: "CLIENT_NOT_DRAFT",
        message: "Client is no longer in draft status",
      } satisfies RunEstimateError;
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const lastRun = await tx.query.estimateRun.findFirst({
        where: and(
          eq(estimateRun.clientId, input.clientId),
          eq(estimateRun.userId, input.userId),
        ),
        orderBy: [desc(estimateRun.createdAt)],
      });

      if (lastRun) {
        const canReuseLastRun =
          lastRun.source === input.source &&
          lastRun.assumptionVersionId === versionInfo.id &&
          lastRun.engineId === ESTIMATE_ENGINE_ID &&
          lastRun.engineVersion === ESTIMATE_ENGINE_VERSION &&
          lastRun.providerKey === "mock" &&
          isDeepStrictEqual(lastRun.inputs, inputs) &&
          isDeepStrictEqual(lastRun.outputs, outputs);

        if (canReuseLastRun) {
          return {
            success: true,
            reusedExisting: true,
            estimateRun: {
              id: lastRun.id,
              runNumber: lastRun.runNumber,
              inputs: lastRun.inputs,
              outputs: lastRun.outputs,
              assumptionVersionId: lastRun.assumptionVersionId,
              assumptionVersionLabel: versionInfo.versionLabel,
              engineId: lastRun.engineId,
              engineVersion: lastRun.engineVersion,
              providerKey: lastRun.providerKey,
              createdAt: lastRun.createdAt,
            },
          } satisfies RunEstimateSuccess;
        }
      }

      const runNumber = lastRun ? lastRun.runNumber + 1 : 1;

      try {
        const [inserted] = await tx
          .insert(estimateRun)
          .values({
            clientId: input.clientId,
            userId: input.userId,
            source: input.source,
            assumptionVersionId: versionInfo.id,
            engineId: ESTIMATE_ENGINE_ID,
            engineVersion: ESTIMATE_ENGINE_VERSION,
            providerKey: "mock",
            inputs,
            outputs,
            runNumber,
          })
          .returning();

        if (!inserted) {
          return {
            success: false,
            errorCode: "INSERT_FAILED",
            message: "Failed to persist estimate run",
          } satisfies RunEstimateError;
        }

        return {
          success: true,
          reusedExisting: false,
          estimateRun: {
            id: inserted.id,
            runNumber: inserted.runNumber,
            inputs,
            outputs,
            assumptionVersionId: versionInfo.id,
            assumptionVersionLabel: versionInfo.versionLabel,
            engineId: ESTIMATE_ENGINE_ID,
            engineVersion: ESTIMATE_ENGINE_VERSION,
            providerKey: "mock",
            createdAt: inserted.createdAt,
          },
        } satisfies RunEstimateSuccess;
      } catch (error) {
        if (attempt === 0 && isUniqueViolation(error)) {
          continue;
        }

        return {
          success: false,
          errorCode: "INSERT_FAILED",
          message: "Failed to persist estimate run",
        } satisfies RunEstimateError;
      }
    }

    return {
      success: false,
      errorCode: "INSERT_FAILED",
      message: "Failed to persist estimate run",
    } satisfies RunEstimateError;
  });
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Retrieves the latest estimate run for a given client.
 *
 * @async
 * @param clientId - The client record UUID.
 * @param userId - The requesting user's ID (ownership check).
 * @returns The latest estimate run record, or null if none exists.
 */
export async function findLatestEstimateRun(
  clientId: string,
  userId: string,
): Promise<EstimateRun | null> {
  const db = getDb();

  const run = await db.query.estimateRun.findFirst({
    where: and(
      eq(estimateRun.clientId, clientId),
      eq(estimateRun.userId, userId),
    ),
    orderBy: [desc(estimateRun.createdAt)],
  });

  if (!run) return null;

  return run;
}

/**
 * Retrieves all estimate runs for a given client, ordered newest first.
 *
 * @async
 * @param clientId - The client record UUID.
 * @param userId - The requesting user's ID (ownership check).
 * @returns Array of estimate run records, newest first.
 */
export async function findEstimateRunsByClient(
  clientId: string,
  userId: string,
): Promise<EstimateRun[]> {
  const db = getDb();

  const runs = await db.query.estimateRun.findMany({
    where: and(
      eq(estimateRun.clientId, clientId),
      eq(estimateRun.userId, userId),
    ),
    orderBy: [desc(estimateRun.createdAt)],
  });

  return runs;
}
