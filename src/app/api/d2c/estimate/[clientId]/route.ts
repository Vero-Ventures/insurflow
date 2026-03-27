/**
 * @fileoverview D2C Estimate Run API routes.
 *
 * GET  /api/d2c/estimate/[clientId]?history=true  – Return estimate run history
 * POST /api/d2c/estimate/[clientId]               – Save a new estimate run
 *
 * Security:
 * - Requires authentication (client account)
 * - Client must be owned by the authenticated user
 */

import { NextResponse } from "next/server";
import { desc, eq, and, max } from "drizzle-orm";
import { z } from "zod";

import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
  requireClientAccount,
} from "@/lib/api/route-helpers";
import { UUID_REGEX } from "@/lib/validation/client";
import { getDb } from "@/server/db";
import { estimateRun, client } from "@/server/db/schemas";

const HISTORY_LIMIT = 20;

/** Zod schema for saving an estimate run */
const saveEstimateRunSchema = z.object({
  recommendedCoverage: z.number().positive(),
  premiumLow: z.number().positive(),
  premiumHigh: z.number().positive(),
  termYears: z.number().int().positive(),
  province: z.enum([
    "AB",
    "BC",
    "MB",
    "NB",
    "NL",
    "NS",
    "NT",
    "NU",
    "ON",
    "PE",
    "QC",
    "SK",
    "YT",
  ]),
});

/**
 * GET /api/d2c/estimate/[clientId]?history=true
 *
 * Returns estimate run history for the specified client.
 *
 * Query parameters:
 * - history (required): must be "true"
 *
 * Response:
 * - estimates: Array of estimate run records (most recent first, up to 20)
 */
export const GET = withApiHandler(
  {
    endpoint: "/api/d2c/estimate/[clientId]",
    method: "GET",
  },
  async (request, { logger, session, params }) => {
    const clientGuard = await requireClientAccount(logger, session);
    if (clientGuard) return clientGuard;

    const clientId = params.clientId;

    if (!clientId || !UUID_REGEX.test(clientId)) {
      await logger.warn("Invalid client ID format", { clientId });
      return NextResponse.json(
        { error: "Invalid client ID format" },
        { status: 400 },
      );
    }

    const url = new URL(request.url);
    if (url.searchParams.get("history") !== "true") {
      return NextResponse.json(
        { error: "Missing required query parameter: history=true" },
        { status: 400 },
      );
    }

    logger.addContext({ clientId });

    const db = getDb();

    // Verify client ownership
    const owned = await db.query.client.findFirst({
      where: and(eq(client.id, clientId), eq(client.userId, session.user.id)),
      columns: { id: true },
    });

    if (!owned) {
      await logger.info("Client not found or not owned by user", {
        statusCode: 404,
        clientId,
      });
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 },
      );
    }

    const estimates = await db
      .select()
      .from(estimateRun)
      .where(
        and(
          eq(estimateRun.clientId, clientId),
          eq(estimateRun.userId, session.user.id),
        ),
      )
      .orderBy(desc(estimateRun.runNumber))
      .limit(HISTORY_LIMIT);

    await logger.info("Estimate history retrieved", {
      statusCode: 200,
      clientId,
      count: estimates.length,
    });

    return { data: { estimates } };
  },
);

/**
 * POST /api/d2c/estimate/[clientId]
 *
 * Saves a new estimate run for the specified client.
 *
 * Path parameters:
 * - clientId: UUID of the D2C client draft
 *
 * Request body:
 * - recommendedCoverage: number
 * - premiumLow: number
 * - premiumHigh: number
 * - termYears: number
 * - province: CanadianProvince
 *
 * Response:
 * - estimate: The newly created estimate run record
 */
export const POST = withApiHandler(
  {
    endpoint: "/api/d2c/estimate/[clientId]",
    method: "POST",
  },
  async (request, { logger, session, params }) => {
    const clientGuard = await requireClientAccount(logger, session);
    if (clientGuard) return clientGuard;

    const clientId = params.clientId;

    if (!clientId || !UUID_REGEX.test(clientId)) {
      await logger.warn("Invalid client ID format", { clientId });
      return NextResponse.json(
        { error: "Invalid client ID format" },
        { status: 400 },
      );
    }

    logger.addContext({ clientId });

    const db = getDb();

    // Verify client ownership
    const owned = await db.query.client.findFirst({
      where: and(eq(client.id, clientId), eq(client.userId, session.user.id)),
      columns: { id: true },
    });

    if (!owned) {
      await logger.info("Client not found or not owned by user", {
        statusCode: 404,
        clientId,
      });
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 },
      );
    }

    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) return bodyResult.error;

    const validationResult = saveEstimateRunSchema.safeParse(bodyResult.body);
    if (!validationResult.success) {
      return handleValidationError(logger, validationResult.error);
    }

    const { recommendedCoverage, premiumLow, premiumHigh, termYears, province } =
      validationResult.data;

    // Determine the next run number and insert atomically inside a transaction
    // to prevent duplicate run numbers from concurrent requests.
    let savedRunNumber = 1;
    const [created] = await db.transaction(async (tx) => {
      const [maxRow] = await tx
        .select({ maxRun: max(estimateRun.runNumber) })
        .from(estimateRun)
        .where(eq(estimateRun.clientId, clientId))
        .for("update");

      savedRunNumber = (maxRow?.maxRun ?? 0) + 1;

      return tx
        .insert(estimateRun)
        .values({
          clientId,
          userId: session.user.id,
          runNumber: savedRunNumber,
          recommendedCoverage: String(recommendedCoverage),
          premiumLow: String(premiumLow),
          premiumHigh: String(premiumHigh),
          termYears,
          province,
        })
        .returning();
    });

    await logger.info("Estimate run saved", {
      statusCode: 201,
      clientId,
      runNumber: savedRunNumber,
    });

    return { data: { estimate: created }, status: 201 };
  },
);
