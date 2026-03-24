/**
 * @fileoverview D2C Draft single-resource API routes.
 *
 * GET   /api/d2c/draft/[clientId] - Retrieve a specific draft by ID
 * PATCH /api/d2c/draft/[clientId] - Update a draft with partial intake data
 *
 * Security:
 * - Requires authentication (any account type, not advisor-only)
 * - Client must be owned by the authenticated user
 * - Client must be in "draft" status
 */

import { NextResponse } from "next/server";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
  requireClientAccount,
} from "@/lib/api/route-helpers";
import { findDraftById, updateDraft } from "@/lib/api/d2c-draft-helpers";
import { d2cIntakeToClientFields } from "@/lib/d2c/client-adapter";
import { UUID_REGEX } from "@/lib/validation/client";
import { z } from "zod";

/**
 * Zod schema mirroring D2cIntake with all fields optional for PATCH.
 * Enforces type safety server-side so the adapter receives valid data.
 */
const partialIntakeSchema = z
  .object({
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
  })
  .refine((val) => Object.keys(val).length > 0, {
    message: "intake must contain at least one field",
  });

const updateDraftSchema = z.object({
  intake: partialIntakeSchema,
});

/**
 * GET /api/d2c/draft/[clientId] - Retrieve a specific draft
 *
 * Path parameters:
 * - clientId: UUID of the draft client
 *
 * Response (found):
 * - draft: The draft client record
 *
 * Response (not found):
 * - 404 with error message
 */
export const GET = withApiHandler(
  {
    endpoint: "/api/d2c/draft/[clientId]",
    method: "GET",
  },
  async (_request, { logger, session, params }) => {
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

    const result = await findDraftById(clientId, session.user.id);

    if (!result.found) {
      await logger.info("Draft not found", { statusCode: 404, clientId });
      return NextResponse.json(
        { error: "Draft not found or you do not have access" },
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

/**
 * PATCH /api/d2c/draft/[clientId] - Update a draft application
 *
 * Path parameters:
 * - clientId: UUID of the draft client
 *
 * Request body:
 * - intake: Partial D2cIntake fields to update
 *
 * Response:
 * - draft: The updated draft client record
 */
export const PATCH = withApiHandler(
  {
    endpoint: "/api/d2c/draft/[clientId]",
    method: "PATCH",
  },
  async (request, { logger, session, params }) => {
    const clientGuard = await requireClientAccount(logger, session);
    if (clientGuard) return clientGuard;

    const clientId = params.clientId;

    // Validate clientId format
    if (!clientId || !UUID_REGEX.test(clientId)) {
      await logger.warn("Invalid client ID format", { clientId });
      return NextResponse.json(
        { error: "Invalid client ID format" },
        { status: 400 },
      );
    }

    logger.addContext({ clientId });

    // Parse and validate body
    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) return bodyResult.error;

    const validationResult = updateDraftSchema.safeParse(bodyResult.body);
    if (!validationResult.success) {
      return handleValidationError(logger, validationResult.error);
    }

    // Convert intake form fields to DB fields via adapter.
    // Zod has validated the shape matches D2cIntake (all fields optional).
    const clientFields = d2cIntakeToClientFields(validationResult.data.intake);

    const result = await updateDraft(clientId, session.user.id, clientFields);

    if (!result.success) {
      await logger.warn("Failed to update draft", {
        errorCode: result.errorCode,
      });

      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        NOT_DRAFT: 409,
        NO_FIELDS: 400,
      };

      return NextResponse.json(
        { error: result.message, errorCode: result.errorCode },
        { status: statusMap[result.errorCode] ?? 500 },
      );
    }

    await logger.info("Draft updated successfully", {
      statusCode: 200,
      clientId: result.draft.id,
    });

    return { data: { draft: result.draft } };
  },
);
