/**
 * @fileoverview D2C Estimate single-resource API route.
 *
 * GET /api/d2c/estimate/[clientId] - Retrieve estimate run history for a client.
 *
 * Security:
 * - Requires authentication (client account type)
 * - Only returns estimates owned by the authenticated user
 *
 * @see Issue #226
 */

import { NextResponse } from "next/server";
import { withApiHandler, requireClientAccount } from "@/lib/api/route-helpers";
import { verifyClientOwnership } from "@/lib/api/client-helpers";
import {
  findLatestEstimateRun,
  findEstimateRunsByClient,
} from "@/lib/api/d2c-estimate-helpers";
import { UUID_REGEX } from "@/lib/validation/client";

/**
 * GET /api/d2c/estimate/[clientId] - Retrieve estimate runs for a client.
 *
 * Path parameters:
 * - clientId: UUID of the client
 *
 * Query parameters:
 * - history: "true" to return all runs (default: latest only)
 *
 * Response (found):
 * - estimateRun: The latest estimate run (when history=false)
 * - estimateRuns: All estimate runs newest first (when history=true)
 *
 * Response (not found):
 * - 404 with error message
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

    logger.addContext({ clientId });

    const ownedClient = await verifyClientOwnership(clientId, session.user.id);
    if (!ownedClient) {
      await logger.info("Client not found", { statusCode: 404, clientId });
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Check if full history was requested
    const url = new URL(request.url);
    const wantsHistory = url.searchParams.get("history") === "true";

    if (wantsHistory) {
      const runs = await findEstimateRunsByClient(clientId, session.user.id);

      await logger.info("Estimate history retrieved", {
        statusCode: 200,
        clientId,
        count: runs.length,
      });

      return { data: { estimateRuns: runs } };
    }

    // Default: return latest only
    const run = await findLatestEstimateRun(clientId, session.user.id);

    if (!run) {
      await logger.info("No estimate found for client", {
        statusCode: 404,
        clientId,
      });
      return NextResponse.json(
        { error: "No estimate found for this client" },
        { status: 404 },
      );
    }

    await logger.info("Latest estimate retrieved", {
      statusCode: 200,
      clientId,
      estimateRunId: run.id,
    });

    return { data: { estimateRun: run } };
  },
);
