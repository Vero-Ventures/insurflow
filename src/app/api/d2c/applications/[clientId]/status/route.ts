/**
 * @fileoverview D2C Application status API route.
 *
 * GET /api/d2c/applications/[clientId]/status - Retrieve application status and timeline
 *
 * Security:
 * - Requires authentication (client account, not advisor-only)
 * - Client must be owned by the authenticated user
 * - Application must exist and not be soft-deleted
 *
 * @see Issue #269
 */

import { NextResponse } from "next/server";
import { withApiHandler, requireClientAccount } from "@/lib/api/route-helpers";
import { findApplicationStatus } from "@/lib/api/d2c-application-helpers";
import { validateUUID } from "@/lib/api/client-helpers";

function applicationNotFoundResponse() {
  return NextResponse.json(
    { error: "Application not found or you do not have access" },
    { status: 404 },
  );
}

/**
 * GET /api/d2c/applications/[clientId]/status
 *
 * Retrieves the application status and full event timeline for a client.
 *
 * Path parameters:
 * - clientId: UUID of the client record
 *
 * Response (found):
 * - application: Current application summary (id, status, providerKey, submittedAt, etc.)
 * - timeline: Chronologically ordered array of status events
 *
 * Response (not found):
 * - 404 with error message
 */
export const GET = withApiHandler(
  {
    endpoint: "/api/d2c/applications/[clientId]/status",
    method: "GET",
    requireAdvisor: false,
  },
  async (_request, { logger, session, params }) => {
    const clientGuard = await requireClientAccount(logger, session);
    if (clientGuard) return clientGuard;

    const clientId = params.clientId ?? "";
    const clientIdError = validateUUID(clientId, "client ID");
    if (clientIdError) {
      await logger.warn("Invalid client ID format", { clientId });
      return clientIdError;
    }

    logger.addContext({ clientId });

    const result = await findApplicationStatus(clientId, session.user.id);

    if (!result.found) {
      await logger.info("Application not found", { statusCode: 404, clientId });
      return applicationNotFoundResponse();
    }

    await logger.info("Application status retrieved successfully", {
      statusCode: 200,
      clientId,
      applicationId: result.application.id,
      status: result.application.status,
      timelineLength: result.timeline.length,
    });

    return {
      data: {
        application: result.application,
        timeline: result.timeline,
      },
    };
  },
);
