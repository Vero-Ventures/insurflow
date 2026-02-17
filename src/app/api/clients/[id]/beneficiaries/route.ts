import { getDb } from "@/server/db";
import { beneficiary } from "@/server/db/schemas";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createBeneficiarySchema } from "@/lib/validation/beneficiary";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";

/**
 * GET /api/clients/[id]/beneficiaries - Get all beneficiaries for a client
 */
export const GET = withApiHandler(
  {
    endpoint: "/api/clients/[id]/beneficiaries",
    method: "GET",
    requireClient: true,
  },
  async (_request, { logger, clientId }) => {
    const db = getDb();

    // Fetch all non-deleted beneficiaries for the client
    const beneficiaries = await db.query.beneficiary.findMany({
      where: and(
        eq(beneficiary.clientId, clientId!),
        isNull(beneficiary.deletedAt),
      ),
      orderBy: (beneficiary, { asc }) => [asc(beneficiary.createdAt)],
    });

    await logger.info("Beneficiaries fetched successfully", {
      beneficiaryCount: beneficiaries.length,
    });

    return { data: { items: beneficiaries } };
  },
);

/**
 * POST /api/clients/[id]/beneficiaries - Create a new beneficiary for a client
 */
export const POST = withApiHandler(
  {
    endpoint: "/api/clients/[id]/beneficiaries",
    method: "POST",
    requireClient: true,
  },
  async (request, { logger, clientId }) => {
    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) {
      return bodyResult.error;
    }

    // Validate request body
    const validationResult = createBeneficiarySchema.safeParse(bodyResult.body);
    if (!validationResult.success) {
      return handleValidationError(logger, validationResult.error);
    }

    const db = getDb();

    // Create new beneficiary
    const [newBeneficiary] = await db
      .insert(beneficiary)
      .values({
        clientId: clientId!,
        firstName: validationResult.data.firstName,
        lastName: validationResult.data.lastName,
        dateOfBirth: validationResult.data.dateOfBirth ?? null,
        relationship: validationResult.data.relationship,
        isPrimary: validationResult.data.isPrimary ?? true,
        notes: validationResult.data.notes ?? null,
      })
      .returning();

    if (!newBeneficiary) {
      await logger.error("Failed to create beneficiary - no result returned");
      return NextResponse.json(
        { error: "Failed to create beneficiary" },
        { status: 500 },
      );
    }

    await logger.info("Beneficiary created successfully", {
      beneficiaryId: newBeneficiary.id,
    });

    return { data: { items: [newBeneficiary] }, status: 201 };
  },
);
