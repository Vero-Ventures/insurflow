/**
 * @fileoverview D2C Estimate API route (collection).
 *
 * POST /api/d2c/estimate - Execute a new estimate run and persist the result.
 *
 * Security:
 * - Requires authentication (client account type)
 * - Estimate is persisted against the authenticated user
 *
 * @see Issue #226
 */

import { NextResponse } from "next/server";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
  requireClientAccount,
} from "@/lib/api/route-helpers";
import { runEstimate } from "@/lib/api/d2c-estimate-helpers";
import { findDraftById } from "@/lib/api/d2c-draft-helpers";
import { z } from "zod";

const estimateRequestSchema = z.object({
  /** Client draft ID to attach this estimate to */
  clientId: z.string().uuid(),
  /** Client's annual income in CAD */
  annualIncome: z.number().positive(),
  /** Age at time of estimate */
  age: z.number().int().min(18).max(120),
  /** Canadian province code */
  province: z.string().min(2).max(2),
  /** Tobacco use flag */
  tobaccoUse: z.boolean(),
  /** Term length in years */
  termYears: z.number().int().min(5).max(40),
  /** User-selected coverage override (0 = use engine recommendation) */
  coverageAmountOverride: z.number().min(0).default(0),
});

/**
 * POST /api/d2c/estimate - Run and persist a new estimate.
 *
 * Request body:
 * - annualIncome: number (required, positive)
 * - age: number (required, 18-120)
 * - province: string (required, 2-char CA province code)
 * - tobaccoUse: boolean (required)
 * - termYears: number (required, 5-40)
 * - clientId: string | null (optional, UUID of existing draft)
 * - coverageAmountOverride: number (optional, 0 = use engine default)
 *
 * Response:
 * - estimateRun: Full estimate run record with inputs, outputs, and metadata
 */
export const POST = withApiHandler(
  {
    endpoint: "/api/d2c/estimate",
    method: "POST",
  },
  async (request, { logger, session }) => {
    const clientGuard = await requireClientAccount(logger, session);
    if (clientGuard) return clientGuard;

    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) return bodyResult.error;

    const validationResult = estimateRequestSchema.safeParse(bodyResult.body);
    if (!validationResult.success) {
      return handleValidationError(logger, validationResult.error);
    }

    const { clientId, ...estimateInputs } = validationResult.data;

    // If clientId is provided, verify ownership
    if (clientId) {
      const draftResult = await findDraftById(clientId, session.user.id);
      if (!draftResult.found) {
        await logger.warn("Client draft not found for estimate", {
          clientId,
          statusCode: 404,
        });
        return NextResponse.json(
          { error: "Client draft not found" },
          { status: 404 },
        );
      }
    }

    const result = await runEstimate({
      userId: session.user.id,
      clientId,
      source: "d2c",
      ...estimateInputs,
    });

    if (!result.success) {
      await logger.error(
        "Estimate run failed",
        new Error(`${result.errorCode}: ${result.message}`),
      );
      return NextResponse.json(
        { error: result.message, errorCode: result.errorCode },
        { status: 500 },
      );
    }

    const statusCode = result.reusedExisting ? 200 : 201;

    await logger.info(
      result.reusedExisting ? "Estimate run reused" : "Estimate run created",
      {
        statusCode,
        estimateRunId: result.estimateRun.id,
        runNumber: result.estimateRun.runNumber,
        clientId,
        reusedExisting: result.reusedExisting,
      },
    );

    return {
      data: { estimateRun: result.estimateRun },
      status: statusCode,
    };
  },
);
