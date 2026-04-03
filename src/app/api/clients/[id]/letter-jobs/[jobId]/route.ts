import { NextResponse } from "next/server";

import { findLetterGenerationJob } from "@/lib/api/letter-generation-helpers";
import { withApiHandler } from "@/lib/api/route-helpers";
import { getDb } from "@/server/db";

export const GET = withApiHandler(
  {
    endpoint: "/api/clients/[id]/letter-jobs/[jobId]",
    method: "GET",
    requireClient: true,
    resourceIdParams: ["jobId"],
  },
  async (_request, { clientId, logger, resourceIds, session }) => {
    const jobId = resourceIds?.jobId ?? "";
    const db = getDb();

    const job = await findLetterGenerationJob(db, {
      jobId,
      clientId: clientId!,
      userId: session.user.id,
    });

    if (!job) {
      await logger.info("Letter generation job not found", {
        statusCode: 404,
        jobId,
      });
      return NextResponse.json(
        { error: "Letter job not found" },
        { status: 404 },
      );
    }

    return {
      data: {
        jobId: job.id,
        status: job.status,
        letter: job.resultLetter,
        generatedAt: job.resultGeneratedAt?.toISOString() ?? null,
        errorCode: job.errorCode,
        errorMessage: job.errorMessage,
      },
    };
  },
);
