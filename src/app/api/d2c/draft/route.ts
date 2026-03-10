/**
 * @fileoverview D2C Draft API routes (collection).
 *
 * POST /api/d2c/draft   - Create a new draft (idempotent)
 * GET  /api/d2c/draft   - Get the user's current draft
 *
 * Security:
 * - Requires authentication (any account type, not advisor-only)
 * - Ownership enforced by helper layer
 */

import { NextResponse } from "next/server";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
  requireClientAccount,
} from "@/lib/api/route-helpers";
import { createDraft, findLatestDraft } from "@/lib/api/d2c-draft-helpers";
import { d2cIntakeToClientFields } from "@/lib/d2c/client-adapter";
import type { D2cIntake } from "@/lib/d2c/intake-types";
import { z } from "zod";

const optionalIntakeSchema = z.object({
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", ""]).optional(),
  province: z
    .enum([
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
      "",
    ])
    .optional(),
  tobaccoUse: z.boolean().optional(),
  annualIncome: z.number().optional(),
  coverageAmount: z.number().optional(),
  termYears: z.number().optional(),
  hasSpouse: z.boolean().optional(),
  spouseAge: z.number().int().min(18).max(120).nullable().optional(),
  youngestChildAge: z.number().int().min(0).max(17).nullable().optional(),
  additionalGoals: z.string().max(2000).optional(),
  healthClass: z
    .enum(["preferred_plus", "preferred", "standard_plus", "standard", ""])
    .optional(),
});

const createDraftSchema = z.object({
  intake: optionalIntakeSchema.optional(),
});

/**
 * POST /api/d2c/draft - Create or return an existing draft
 *
 * Request body (optional):
 * - intake: Partial D2cIntake fields to seed the draft with
 *
 * Response:
 * - draft: The draft client record
 * - existed: Whether a pre-existing draft was returned
 */
export const POST = withApiHandler(
  {
    endpoint: "/api/d2c/draft",
    method: "POST",
    requireAdvisor: false,
  },
  async (request, { logger, session }) => {
    const clientGuard = await requireClientAccount(logger, session);
    if (clientGuard) return clientGuard;

    // Body is optional — an empty POST creates a draft with defaults.
    // Detect empty body by content-length or reading text once, then
    // parse JSON only when there is content.  This avoids swallowing
    // malformed JSON: if content exists but is not valid JSON, we
    // return 400 instead of silently proceeding.
    let initialFields = {};

    // Detect whether to parse body:
    // - If Content-Type is application/json, always try to parse (catches malformed JSON)
    // - If Content-Length is "0", skip (explicitly empty)
    // - Otherwise, skip (no body sent)
    const contentType = request.headers.get("content-type");
    const contentLength = request.headers.get("content-length");
    const hasJsonBody =
      contentType?.includes("application/json") && contentLength !== "0";

    if (hasJsonBody) {
      const bodyResult = await parseJsonBody<{ intake?: Partial<D2cIntake> }>(
        request,
        logger,
      );
      if ("error" in bodyResult) {
        return bodyResult.error;
      }

      const validationResult = createDraftSchema.safeParse(bodyResult.body);
      if (!validationResult.success) {
        return handleValidationError(logger, validationResult.error);
      }

      if (validationResult.data.intake) {
        initialFields = d2cIntakeToClientFields(validationResult.data.intake);
      }
    }

    const result = await createDraft(session.user.id, initialFields);

    if (!result.success) {
      await logger.warn("Failed to create draft", {
        errorCode: result.errorCode,
      });
      return NextResponse.json(
        { error: result.message, errorCode: result.errorCode },
        { status: 500 },
      );
    }

    await logger.info("Draft created/retrieved successfully", {
      statusCode: result.existed ? 200 : 201,
      clientId: result.draft.id,
      existed: result.existed,
    });

    return {
      data: {
        draft: result.draft,
        existed: result.existed,
      },
      status: result.existed ? 200 : 201,
    };
  },
);

/**
 * GET /api/d2c/draft - Get the user's latest draft
 *
 * Response (found):
 * - draft: The draft client record
 *
 * Response (not found):
 * - 404 with error message
 */
export const GET = withApiHandler(
  {
    endpoint: "/api/d2c/draft",
    method: "GET",
    requireAdvisor: false,
  },
  async (_request, { logger, session }) => {
    const clientGuard = await requireClientAccount(logger, session);
    if (clientGuard) return clientGuard;

    const result = await findLatestDraft(session.user.id);

    if (!result.found) {
      await logger.info("No draft found for user", { statusCode: 404 });
      return NextResponse.json(
        { error: "No draft application found" },
        { status: 404 },
      );
    }

    await logger.info("Draft retrieved successfully", {
      statusCode: 200,
      clientId: result.draft.id,
    });

    return { data: { draft: result.draft } };
  },
);
