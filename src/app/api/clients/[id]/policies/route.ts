import { getDb } from "@/server/db";
import { policy } from "@/server/db/schemas";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createPolicySchema } from "@/lib/validation/policy";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";

/**
 * GET /api/clients/[id]/policies - Get all policies for a client
 */
export const GET = withApiHandler(
  {
    endpoint: "/api/clients/[id]/policies",
    method: "GET",
    requireClient: true,
  },
  async (_request, { logger, clientId }) => {
    const db = getDb();

    // Fetch all non-deleted policies for the client
    const policies = await db.query.policy.findMany({
      where: and(eq(policy.clientId, clientId!), isNull(policy.deletedAt)),
    });

    await logger.info("Policies fetched successfully", {
      statusCode: 200,
      policyCount: policies.length,
    });

    return { data: { items: policies } };
  },
);

/**
 * POST /api/clients/[id]/policies - Create a new policy for a client
 */
export const POST = withApiHandler(
  {
    endpoint: "/api/clients/[id]/policies",
    method: "POST",
    requireClient: true,
  },
  async (request, { logger, clientId }) => {
    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) return bodyResult.error;

    // Validate request body
    const validationResult = createPolicySchema.safeParse(bodyResult.body);
    if (!validationResult.success) {
      return handleValidationError(logger, validationResult.error);
    }

    const db = getDb();

    // Create new policy
    const [newPolicy] = await db
      .insert(policy)
      .values({
        clientId: clientId!,
        policyNumber: validationResult.data.policyNumber,
        carrierName: validationResult.data.carrierName,
        type: validationResult.data.type,
        faceAmount: validationResult.data.faceAmount,
        annualPremium: validationResult.data.annualPremium,
        issueDate: validationResult.data.issueDate,
        expiryDate: validationResult.data.expiryDate,
        cashValue: validationResult.data.cashValue,
        status: validationResult.data.status,
        riders: validationResult.data.riders,
        notes: validationResult.data.notes,
      })
      .returning();

    if (!newPolicy) {
      await logger.error("Failed to create policy - no result returned");
      return NextResponse.json(
        { error: "Failed to create policy" },
        { status: 500 },
      );
    }

    await logger.info("Policy created successfully", {
      statusCode: 201,
      policyId: newPolicy.id,
    });

    return { data: { policy: newPolicy }, status: 201 };
  },
);
