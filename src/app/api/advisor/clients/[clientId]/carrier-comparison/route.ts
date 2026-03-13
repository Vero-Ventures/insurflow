import { NextResponse } from "next/server";

import { findAdvisorCarrierComparison } from "@/lib/api/advisor-comparison-helpers";
import { validateUUID } from "@/lib/api/client-helpers";
import { withApiHandler } from "@/lib/api/route-helpers";

export const GET = withApiHandler(
  {
    endpoint: "/api/advisor/clients/[clientId]/carrier-comparison",
    method: "GET",
    requireAdvisor: true,
  },
  async (_request, { logger, session, params }) => {
    const clientId = params.clientId ?? "";
    const clientIdError = validateUUID(clientId, "client ID");

    if (clientIdError) {
      await logger.warn("Invalid client ID format", { clientId });
      return clientIdError;
    }

    const result = await findAdvisorCarrierComparison(
      clientId,
      session.user.id,
    );

    if (!result.found) {
      await logger.info("Client not found for advisor comparison", {
        statusCode: 404,
        clientId,
      });
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (!result.ready) {
      await logger.info("Comparison request missing required fields", {
        statusCode: 422,
        clientId,
        missingFields: result.missingFields,
      });
      return NextResponse.json(
        {
          error: "Missing required fields for carrier comparison",
          missingFields: result.missingFields,
        },
        { status: 422 },
      );
    }

    await logger.info("Advisor carrier comparison generated", {
      statusCode: 200,
      clientId,
      optionCount: result.options.length,
    });

    return {
      data: {
        request: result.request,
        options: result.options,
      },
    };
  },
);
