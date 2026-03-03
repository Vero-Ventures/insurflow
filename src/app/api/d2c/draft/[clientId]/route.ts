/**
 * @fileoverview D2C Draft update API route.
 *
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
} from "@/lib/api/route-helpers";
import { updateDraft } from "@/lib/api/d2c-draft-helpers";
import { d2cIntakeToClientFields } from "@/lib/d2c/client-adapter";
import type { D2cIntake } from "@/lib/d2c/intake-types";
import { UUID_REGEX } from "@/lib/validation/client";
import { z } from "zod";

/**
 * Validation schema for draft update request body.
 */
const updateDraftSchema = z.object({
  intake: z
    .record(z.string(), z.unknown())
    .refine((val) => Object.keys(val).length > 0, {
      message: "intake must contain at least one field",
    }),
});

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
    requireAdvisor: false,
  },
  async (request, { logger, session, params }) => {
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

    // Convert intake form fields to DB fields via adapter
    const clientFields = d2cIntakeToClientFields(
      validationResult.data.intake as unknown as D2cIntake,
    );

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
