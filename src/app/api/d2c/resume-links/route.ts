/**
 * @fileoverview D2C Resume Links API routes.
 *
 * POST /api/d2c/resume-links - Generate a resume link for a draft application
 *
 * Security:
 * - Requires authentication
 * - User must own the draft client
 * - Client must be in "draft" status
 */

import { NextResponse } from "next/server";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";
import { createResumeLinkSchema } from "@/lib/validation/d2c-resume-link";
import { createResumeLink } from "@/lib/api/d2c-resume-link-helpers";

/**
 * POST /api/d2c/resume-links - Create a resume link for a draft
 *
 * Request body:
 * - clientId: UUID of the draft client
 *
 * Response:
 * - token: The resume link token
 * - expiresAt: ISO timestamp when the link expires
 * - resumeUrl: Relative URL path to resume the draft
 */
export const POST = withApiHandler(
  {
    endpoint: "/api/d2c/resume-links",
    method: "POST",
    // Note: Not requiring advisor - this is for D2C consumers
  },
  async (request, { logger, session }) => {
    // Parse and validate request body
    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) return bodyResult.error;

    const validationResult = createResumeLinkSchema.safeParse(bodyResult.body);
    if (!validationResult.success) {
      return handleValidationError(logger, validationResult.error);
    }

    const { clientId } = validationResult.data;
    logger.addContext({ clientId });

    // Create the resume link
    const result = await createResumeLink(clientId, session.user.id);

    if (!result.success) {
      await logger.warn("Failed to create resume link", {
        errorCode: result.errorCode,
        message: result.message,
      });

      const statusCode = result.errorCode === "CLIENT_NOT_FOUND" ? 404 : 400;

      return NextResponse.json(
        {
          error: result.message,
          errorCode: result.errorCode,
        },
        { status: statusCode },
      );
    }

    await logger.info("Resume link created successfully", {
      statusCode: 201,
      expiresAt: result.expiresAt.toISOString(),
    });

    return {
      data: {
        token: result.token,
        expiresAt: result.expiresAt.toISOString(),
        resumeUrl: result.resumeUrl,
      },
      status: 201,
    };
  },
);
