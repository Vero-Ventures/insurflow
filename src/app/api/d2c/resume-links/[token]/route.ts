/**
 * @fileoverview D2C Resume Link verification API route.
 *
 * GET /api/d2c/resume-links/[token] - Verify and consume a resume link
 *
 * Security:
 * - Requires authentication
 * - Link must belong to the authenticated user
 * - Link must not be expired or already used
 * - Associated client must still be in draft status
 */

import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/route-helpers";
import { resumeLinkTokenSchema } from "@/lib/validation/d2c-resume-link";
import {
  verifyResumeLink,
  markResumeLinkUsed,
} from "@/lib/api/d2c-resume-link-helpers";

/**
 * GET /api/d2c/resume-links/[token] - Verify and use a resume link
 *
 * Path parameters:
 * - token: The resume link token
 *
 * Response (success):
 * - valid: true
 * - clientId: UUID of the draft client
 * - redirectUrl: URL to redirect to for resuming
 *
 * Response (error):
 * - valid: false
 * - errorCode: EXPIRED | NOT_FOUND | ALREADY_USED | CLIENT_NOT_DRAFT
 * - message: Human-readable error message
 */
export const GET = withApiHandler(
  {
    endpoint: "/api/d2c/resume-links/[token]",
    method: "GET",
    // Not requiring advisor - this is for D2C consumers
    requireAdvisor: false,
  },
  async (_request, { logger, session, params }) => {
    const token = params.token;

    // Token is required in path - return 404 for consistency with NOT_FOUND mapping
    if (!token) {
      await logger.warn("Missing resume link token");
      return NextResponse.json(
        {
          valid: false,
          errorCode: "NOT_FOUND",
          message: "Resume link not found",
        },
        { status: 404 },
      );
    }

    // Validate token format - return 404 for consistency (don't leak validation details)
    const tokenValidation = resumeLinkTokenSchema.safeParse(token);
    if (!tokenValidation.success) {
      await logger.warn("Invalid resume link token format");
      return NextResponse.json(
        {
          valid: false,
          errorCode: "NOT_FOUND",
          message: "Resume link not found",
        },
        { status: 404 },
      );
    }

    // Verify the resume link
    const result = await verifyResumeLink(token, session.user.id);

    if (!result.valid) {
      await logger.warn("Resume link verification failed", {
        errorCode: result.errorCode,
      });

      // Map error codes to HTTP status codes
      // Note: UNAUTHORIZED is intentionally not a separate case - it returns NOT_FOUND
      // to prevent token enumeration attacks (information leakage)
      const statusCode = result.errorCode === "NOT_FOUND" ? 404 : 400;

      return NextResponse.json(
        {
          valid: false,
          errorCode: result.errorCode,
          message: result.message,
        },
        { status: statusCode },
      );
    }

    // Atomically mark the link as used (prevents race conditions)
    const wasMarked = await markResumeLinkUsed(result.linkId);

    // If marking failed, another request consumed the link first
    if (!wasMarked) {
      await logger.warn("Resume link was consumed by concurrent request", {
        linkId: result.linkId,
      });
      return NextResponse.json(
        {
          valid: false,
          errorCode: "ALREADY_USED",
          message: "This resume link has already been used",
        },
        { status: 400 },
      );
    }

    logger.addContext({ clientId: result.clientId });
    await logger.info("Resume link verified and consumed successfully", {
      statusCode: 200,
    });

    // Build the redirect URL for the client application
    const redirectUrl = `/d2c/intake?clientId=${result.clientId}`;

    return {
      data: {
        valid: true,
        clientId: result.clientId,
        redirectUrl,
      },
    };
  },
);
