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
import { withApiHandler, parseJsonBody } from "@/lib/api/route-helpers";
import { createDraft, findLatestDraft } from "@/lib/api/d2c-draft-helpers";
import { d2cIntakeToClientFields } from "@/lib/d2c/client-adapter";
import type { D2cIntake } from "@/lib/d2c/intake-types";

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
    // Body is optional — an empty POST creates a draft with defaults
    let initialFields = {};

    try {
      const bodyResult = await parseJsonBody<{ intake?: Partial<D2cIntake> }>(
        request,
        logger,
      );
      if (!("error" in bodyResult) && bodyResult.body.intake) {
        initialFields = d2cIntakeToClientFields(
          bodyResult.body.intake as D2cIntake,
        );
      }
    } catch {
      // Empty body is fine — use defaults
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
