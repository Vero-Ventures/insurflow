import { getDb } from "@/server/db";
import { keyPerson } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { updateKeyPersonSchema } from "@/lib/validation/key-person";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";
import { verifyBusinessOwnership } from "@/lib/api/client-helpers";

/**
 * PUT /api/clients/[id]/businesses/[businessId]/key-people/[keyPersonId] - Update a key person
 */
export const PUT = withApiHandler(
  {
    endpoint:
      "/api/clients/[id]/businesses/[businessId]/key-people/[keyPersonId]",
    method: "PUT",
    requireClient: true,
    resourceIdParams: ["businessId", "keyPersonId"],
  },
  async (request, { logger, clientId, resourceIds }) => {
    const businessId = resourceIds?.businessId;
    const keyPersonId = resourceIds?.keyPersonId;
    if (!businessId || !keyPersonId) {
      return NextResponse.json(
        { error: "Business ID and Key Person ID are required" },
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
    const validationResult = updateKeyPersonSchema.safeParse(bodyResult.body);
    if (!validationResult.success) {
      return handleValidationError(logger, validationResult.error);
    }

    // Check if no fields were provided
    if (Object.keys(validationResult.data).length === 0) {
      await logger.warn("No fields provided for update");
      return NextResponse.json(
        { error: "No fields provided for update" },
        { status: 400 },
      );
    }

    const db = getDb();

    // Find the key person (must belong to this business and not be deleted)
    const existingKeyPerson = await db.query.keyPerson.findFirst({
      where: and(
        eq(keyPerson.id, keyPersonId),
        eq(keyPerson.businessId, businessId),
        isNull(keyPerson.deletedAt),
      ),
    });

    if (!existingKeyPerson) {
      await logger.info("Key person not found", { statusCode: 404 });
      return NextResponse.json(
        { error: "Key person not found" },
        { status: 404 },
      );
    }

    // Update the key person
    const [updatedKeyPerson] = await db
      .update(keyPerson)
      .set({
        ...validationResult.data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(keyPerson.id, keyPersonId),
          eq(keyPerson.businessId, businessId),
          isNull(keyPerson.deletedAt),
        ),
      )
      .returning();

    if (!updatedKeyPerson) {
      await logger.error("Failed to update key person");
      return NextResponse.json(
        { error: "Failed to update key person" },
        { status: 500 },
      );
    }

    await logger.info("Key person updated successfully", {
      keyPersonId: updatedKeyPerson.id,
    });

    return { data: { keyPerson: updatedKeyPerson } };
  },
);

/**
 * DELETE /api/clients/[id]/businesses/[businessId]/key-people/[keyPersonId] - Soft delete a key person
 */
export const DELETE = withApiHandler(
  {
    endpoint:
      "/api/clients/[id]/businesses/[businessId]/key-people/[keyPersonId]",
    method: "DELETE",
    requireClient: true,
    resourceIdParams: ["businessId", "keyPersonId"],
  },
  async (_request, { logger, clientId, resourceIds }) => {
    const businessId = resourceIds?.businessId;
    const keyPersonId = resourceIds?.keyPersonId;
    if (!businessId || !keyPersonId) {
      return NextResponse.json(
        { error: "Business ID and Key Person ID are required" },
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

    // Find and soft-delete the key person
    const now = new Date();
    const [deletedKeyPerson] = await db
      .update(keyPerson)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(keyPerson.id, keyPersonId),
          eq(keyPerson.businessId, businessId),
          isNull(keyPerson.deletedAt),
        ),
      )
      .returning();

    if (!deletedKeyPerson) {
      await logger.info("Key person not found", { statusCode: 404 });
      return NextResponse.json(
        { error: "Key person not found" },
        { status: 404 },
      );
    }

    await logger.info("Key person deleted successfully", {
      keyPersonId: deletedKeyPerson.id,
    });

    return { data: { message: "Key person deleted successfully" } };
  },
);
