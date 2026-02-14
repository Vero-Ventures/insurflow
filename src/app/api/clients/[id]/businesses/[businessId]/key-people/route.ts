import { getDb } from "@/server/db";
import { keyPerson } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createKeyPersonSchema } from "@/lib/validation/key-person";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";
import { verifyBusinessOwnership } from "@/lib/api/client-helpers";

/**
 * GET /api/clients/[id]/businesses/[businessId]/key-people - List key people for a business
 */
export const GET = withApiHandler(
  {
    endpoint: "/api/clients/[id]/businesses/[businessId]/key-people",
    method: "GET",
    requireClient: true,
    resourceIdParams: ["businessId"],
  },
  async (_request, { logger, clientId, resourceIds }) => {
    const businessId = resourceIds?.businessId;
    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 },
      );
    }

    // Verify business belongs to this client
    const foundBusiness = await verifyBusinessOwnership(businessId, clientId!);
    if (!foundBusiness) {
      await logger.info("Business not found", { statusCode: 404 });
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 },
      );
    }

    const db = getDb();

    const keyPeople = await db.query.keyPerson.findMany({
      where: and(
        eq(keyPerson.businessId, businessId),
        isNull(keyPerson.deletedAt),
      ),
    });

    await logger.info("Key people fetched successfully", {
      keyPersonCount: keyPeople.length,
    });

    return { data: { items: keyPeople } };
  },
);

/**
 * POST /api/clients/[id]/businesses/[businessId]/key-people - Create a key person
 */
export const POST = withApiHandler(
  {
    endpoint: "/api/clients/[id]/businesses/[businessId]/key-people",
    method: "POST",
    requireClient: true,
    resourceIdParams: ["businessId"],
  },
  async (request, { logger, clientId, resourceIds }) => {
    const businessId = resourceIds?.businessId;
    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 },
      );
    }

    // Verify business belongs to this client
    const foundBusiness = await verifyBusinessOwnership(businessId, clientId!);
    if (!foundBusiness) {
      await logger.info("Business not found", { statusCode: 404 });
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 },
      );
    }

    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) {
      return bodyResult.error;
    }

    // Validate request body
    const validationResult = createKeyPersonSchema.safeParse(bodyResult.body);
    if (!validationResult.success) {
      return handleValidationError(logger, validationResult.error);
    }

    const db = getDb();

    const [newKeyPerson] = await db
      .insert(keyPerson)
      .values({
        businessId,
        name: validationResult.data.name,
        role: validationResult.data.role,
        compensation: validationResult.data.compensation,
        ownershipPercentage: validationResult.data.ownershipPercentage,
      })
      .returning();

    if (!newKeyPerson) {
      await logger.error("Failed to create key person - no result returned");
      return NextResponse.json(
        { error: "Failed to create key person" },
        { status: 500 },
      );
    }

    await logger.info("Key person created successfully", {
      keyPersonId: newKeyPerson.id,
    });

    return { data: { items: [newKeyPerson] }, status: 201 };
  },
);
