import { getDb } from "@/server/db";
import { lifeEventRecalculation } from "@/server/db/schemas";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";
import { computeCurrentSnapshot } from "@/lib/financial/compute-snapshot";

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

const deleteEventSchema = z.object({
  eventId: z.string().uuid(),
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

// ============================================================================
// DELETE /api/clients/[id]/life-events
// ============================================================================

/**
 * DELETE /api/clients/[id]/life-events
 *
 * Deletes a life event recalculation record.
 *
 * Request body:
 * - eventId: UUID of the life event record to delete
 */
export const DELETE = withApiHandler(
  {
    endpoint: "/api/clients/[id]/life-events",
    method: "DELETE",
    requireClient: true,
  },
  async (request, { logger, clientId }) => {
    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) return bodyResult.error;

    const validationResult = deleteEventSchema.safeParse(bodyResult.body);
    if (!validationResult.success) {
      return handleValidationError(
        logger,
        validationResult.error,
        "Invalid delete parameters",
      );
    }

    const { eventId } = validationResult.data;

    const db = getDb();

    const [deleted] = await db
      .delete(lifeEventRecalculation)
      .where(
        and(
          eq(lifeEventRecalculation.id, eventId),
          eq(lifeEventRecalculation.clientId, clientId!),
        ),
      )
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Life event not found" },
        { status: 404 },
      );
    }

    await logger.info("Life event recalculation deleted", {
      statusCode: 200,
      eventId,
      clientId,
    });

    return { data: { deletedId: eventId } };
  },
);
