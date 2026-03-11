import { getDb } from "@/server/db";
import {
  client,
  asset,
  debt,
  policy,
  lifeEventRecalculation,
} from "@/server/db/schemas";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";
import {
  calculateInsuranceNeedsRounded,
  DEFAULT_ESTATE_BUFFER,
  type InsuranceNeedsInput,
} from "@/lib/financial/insurance-needs";
import { resolveExistingCoverage } from "@/lib/policy-utils";
import type { InsuranceNeedsSnapshot } from "@/server/db/schemas/life-events-schema";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const insuranceNeedsSnapshotSchema = z.object({
  incomeReplacementNeeds: z.number().min(0),
  debtPayoffNeeds: z.number().min(0),
  estateBufferNeeds: z.number().min(0),
  grossNeeds: z.number().min(0),
  existingCoverage: z.number().min(0),
  liquidAssets: z.number().min(0),
  totalInsuranceNeeds: z.number().min(0),
});

const lifeEventTypeSchema = z.enum([
  "income_change",
  "new_child",
  "debt_change",
  "marriage",
  "divorce",
]);

const triggerLifeEventSchema = z.object({
  lifeEvent: lifeEventTypeSchema,
  notes: z.string().max(1000).optional(),
  /** The current estimate snapshot the advisor sees (before state) */
  beforeSnapshot: insuranceNeedsSnapshotSchema,
});

// ============================================================================
// HELPERS
// ============================================================================

function decimalToNumber(value: string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Compute a fresh insurance needs snapshot from current client DB state.
 * Mirrors the logic in /api/clients/[id]/calculate but returns only snapshot fields.
 */
async function computeCurrentSnapshot(
  clientId: string,
  userId: string,
): Promise<InsuranceNeedsSnapshot | null> {
  const db = getDb();

  const clientData = await db.query.client.findFirst({
    where: and(
      eq(client.id, clientId),
      eq(client.userId, userId),
      isNull(client.deletedAt),
    ),
  });

  if (!clientData) return null;

  const [assetTotals] = await db
    .select({
      totalAssets: sql<string>`COALESCE(SUM(${asset.currentValue}), 0)`,
      liquidAssets: sql<string>`COALESCE(SUM(CASE WHEN ${asset.isLiquid} THEN ${asset.currentValue} ELSE 0 END), 0)`,
    })
    .from(asset)
    .where(and(eq(asset.clientId, clientId), isNull(asset.deletedAt)));

  const [debtTotals] = await db
    .select({
      totalDebts: sql<string>`COALESCE(SUM(${debt.currentBalance}), 0)`,
    })
    .from(debt)
    .where(and(eq(debt.clientId, clientId), isNull(debt.deletedAt)));

  const [policyTotals] = await db
    .select({
      totalActivePolicyCoverage: sql<string>`COALESCE(SUM(CASE WHEN ${policy.status} = 'active' THEN ${policy.faceAmount} ELSE 0 END), 0)`,
      totalPolicyCount: sql<number>`COUNT(*)`,
    })
    .from(policy)
    .where(and(eq(policy.clientId, clientId), isNull(policy.deletedAt)));

  const totalAssets = decimalToNumber(assetTotals?.totalAssets);
  const liquidAssets = decimalToNumber(assetTotals?.liquidAssets);
  const totalDebts = decimalToNumber(debtTotals?.totalDebts);
  const policyCount = Number(policyTotals?.totalPolicyCount ?? 0);
  const totalActivePolicyCoverage = decimalToNumber(
    policyTotals?.totalActivePolicyCoverage,
  );

  const { existingCoverage } = resolveExistingCoverage({
    totalPolicyCount: policyCount,
    activePolicyCoverage: totalActivePolicyCoverage,
    legacyCoverage: decimalToNumber(clientData.existingLifeInsuranceCoverage),
  });

  const input: InsuranceNeedsInput = {
    clientIncome: decimalToNumber(clientData.clientIncome),
    spouseIncome: decimalToNumber(clientData.spouseIncome),
    includeSpouseIncome: clientData.hasSpouse ?? false,
    incomeReplacementPercent: decimalToNumber(
      clientData.incomeReplacementPercent,
    ),
    replacementDurationYears: clientData.replacementDurationYears ?? 10,
    existingLifeInsuranceCoverage: existingCoverage,
    totalDebts,
    liquidAssets,
    totalAssets,
    estateBuffer: DEFAULT_ESTATE_BUFFER,
  };

  const result = calculateInsuranceNeedsRounded(input);

  return {
    incomeReplacementNeeds: result.incomeReplacementNeeds,
    debtPayoffNeeds: result.debtPayoffNeeds,
    estateBufferNeeds: result.estateBufferNeeds,
    grossNeeds: result.grossNeeds,
    existingCoverage: result.existingCoverage,
    liquidAssets: result.liquidAssets,
    totalInsuranceNeeds: result.totalInsuranceNeeds,
  };
}

// ============================================================================
// GET /api/clients/[id]/life-events
// ============================================================================

/**
 * GET /api/clients/[id]/life-events
 *
 * Returns all life event recalculations for a client, newest first.
 */
export const GET = withApiHandler(
  {
    endpoint: "/api/clients/[id]/life-events",
    method: "GET",
    requireClient: true,
  },
  async (_request, { clientId }) => {
    const db = getDb();

    const events = await db
      .select()
      .from(lifeEventRecalculation)
      .where(eq(lifeEventRecalculation.clientId, clientId!))
      .orderBy(desc(lifeEventRecalculation.triggeredAt));

    return { data: { events } };
  },
);

// ============================================================================
// POST /api/clients/[id]/life-events
// ============================================================================

/**
 * POST /api/clients/[id]/life-events
 *
 * Records a life event and stores before/after insurance needs snapshots.
 *
 * Request body:
 * - lifeEvent: "income_change" | "new_child" | "debt_change" | "marriage" | "divorce"
 * - notes?: string (optional advisor notes, max 1000 chars)
 * - beforeSnapshot: InsuranceNeedsSnapshot (current estimate the advisor sees)
 *
 * Response:
 * - event: the created LifeEventRecalculation record
 */
export const POST = withApiHandler(
  {
    endpoint: "/api/clients/[id]/life-events",
    method: "POST",
    requireClient: true,
  },
  async (request, { logger, clientId, session }) => {
    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) return bodyResult.error;

    const validationResult = triggerLifeEventSchema.safeParse(bodyResult.body);
    if (!validationResult.success) {
      return handleValidationError(
        logger,
        validationResult.error,
        "Invalid life event parameters",
      );
    }

    const { lifeEvent, notes, beforeSnapshot } = validationResult.data;

    // Compute fresh "after" snapshot from current client data
    const afterSnapshot = await computeCurrentSnapshot(
      clientId!,
      session.user.id,
    );

    if (!afterSnapshot) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const db = getDb();

    const [event] = await db
      .insert(lifeEventRecalculation)
      .values({
        clientId: clientId!,
        userId: session.user.id,
        lifeEvent,
        notes: notes ?? null,
        triggeredAt: new Date(),
        beforeSnapshot,
        afterSnapshot,
      })
      .returning();

    await logger.info("Life event recalculation recorded", {
      statusCode: 201,
      lifeEvent,
      clientId,
    });

    return { data: { event }, status: 201 };
  },
);

// ============================================================================
// PATCH /api/clients/[id]/life-events
// ============================================================================

const recalculateEventSchema = z.object({
  /** The ID of the life event record to update */
  eventId: z.string().uuid(),
  /** The current estimate the advisor sees — becomes the new beforeSnapshot */
  beforeSnapshot: insuranceNeedsSnapshotSchema,
});

/**
 * PATCH /api/clients/[id]/life-events
 *
 * Recalculates (updates) an existing life event record.
 * Replaces both beforeSnapshot and afterSnapshot with fresh data
 * and updates triggeredAt to now.
 */
export const PATCH = withApiHandler(
  {
    endpoint: "/api/clients/[id]/life-events",
    method: "PATCH",
    requireClient: true,
  },
  async (request, { logger, clientId, session }) => {
    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) return bodyResult.error;

    const validationResult = recalculateEventSchema.safeParse(bodyResult.body);
    if (!validationResult.success) {
      return handleValidationError(
        logger,
        validationResult.error,
        "Invalid recalculate parameters",
      );
    }

    const { eventId, beforeSnapshot } = validationResult.data;

    const db = getDb();

    // Verify the event belongs to this client
    const existing = await db.query.lifeEventRecalculation.findFirst({
      where: and(
        eq(lifeEventRecalculation.id, eventId),
        eq(lifeEventRecalculation.clientId, clientId!),
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Life event not found" },
        { status: 404 },
      );
    }

    // Compute fresh "after" snapshot
    const afterSnapshot = await computeCurrentSnapshot(
      clientId!,
      session.user.id,
    );

    if (!afterSnapshot) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(lifeEventRecalculation)
      .set({
        beforeSnapshot,
        afterSnapshot,
        triggeredAt: new Date(),
      })
      .where(
        and(
          eq(lifeEventRecalculation.id, eventId),
          eq(lifeEventRecalculation.clientId, clientId!),
        ),
      )
      .returning();

    await logger.info("Life event recalculation updated", {
      statusCode: 200,
      eventId,
      clientId,
    });

    return { data: { event: updated } };
  },
);
