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
  parseJsonBody,
  handleValidationError,
  resolveOptionalSession,
} from "@/lib/api/route-helpers";
import {
  computeGuestEstimate,
  runEstimate,
} from "@/lib/api/d2c-estimate-helpers";
import { findDraftById } from "@/lib/api/d2c-draft-helpers";
import { createLogger } from "@/server/axiom";
import { z } from "zod";

const estimateRequestSchema = z.object({
  /** Client draft ID to attach this estimate to (optional for session-only) */
  clientId: z.string().uuid().nullable().optional(),
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
export async function POST(request: Request): Promise<NextResponse> {
  const logger = createLogger({
    endpoint: "/api/d2c/estimate",
    method: "POST",
  });

  try {
    await logger.info("API request received", {
      requestUrl: request.url,
      requestMethod: request.method,
    });

    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) return bodyResult.error;

    const validationResult = estimateRequestSchema.safeParse(bodyResult.body);
    if (!validationResult.success) {
      return handleValidationError(logger, validationResult.error);
    }

    const { clientId, ...estimateInputs } = validationResult.data;

    const session = await resolveOptionalSession();
    const userId = session?.user.id ?? null;

    if (userId) {
      logger.addContext({ userId });
    }

    // If clientId is provided, verify ownership for signed-in requests.
    // Guest flow cannot resolve ownership and should not claim a clientId.
    if (clientId) {
      if (!userId) {
        await logger.warn("Guest estimate request cannot use clientId", {
          clientId,
          statusCode: 401,
        });
        return NextResponse.json(
          { error: "Authentication required when clientId is provided" },
          { status: 401 },
        );
      }

      const draftResult = await findDraftById(clientId, userId);
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

    if (!userId) {
      const outputs = await computeGuestEstimate({
        annualIncome: estimateInputs.annualIncome,
        age: estimateInputs.age,
        province: estimateInputs.province,
        tobaccoUse: estimateInputs.tobaccoUse,
        termYears: estimateInputs.termYears,
        coverageAmountOverride: estimateInputs.coverageAmountOverride,
      });

      await logger.info("Guest estimate generated (not persisted)", {
        statusCode: 200,
      });

      return NextResponse.json({
        estimateRun: {
          id: null,
          runNumber: 0,
          outputs,
          assumptionVersionLabel: "ca-term-life-v1",
          engineVersion: "1.0.0",
          createdAt: new Date().toISOString(),
        },
        persisted: false,
      });
    }

    const result = await runEstimate({
      userId,
      clientId: clientId ?? null,
      source: "d2c",
      annualIncome: estimateInputs.annualIncome,
      age: estimateInputs.age,
      province: estimateInputs.province,
      tobaccoUse: estimateInputs.tobaccoUse,
      termYears: estimateInputs.termYears,
      coverageAmountOverride: estimateInputs.coverageAmountOverride,
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

    return NextResponse.json(
      { estimateRun: result.estimateRun, persisted: true },
      { status: statusCode },
    );
  } catch (error) {
    await logger.error(
      "Error in POST /api/d2c/estimate",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
