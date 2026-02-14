import { NextResponse } from "next/server";
import { updateBusinessSchema } from "@/lib/validation/business";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";
import {
  updateResource,
  deleteResource,
  businessConfig,
} from "@/lib/api/resource-helpers";
import { getDb } from "@/server/db";
import { business } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";

/**
 * GET /api/clients/[id]/businesses/[businessId] - Get a single business
 */
export const GET = withApiHandler(
  {
    endpoint: "/api/clients/[id]/businesses/[businessId]",
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

    const db = getDb();

    const foundBusiness = await db.query.business.findFirst({
      where: and(
        eq(business.id, businessId),
        eq(business.clientId, clientId!),
        isNull(business.deletedAt),
      ),
    });

    if (!foundBusiness) {
      await logger.info("Business not found", { statusCode: 404 });
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 },
      );
    }

    await logger.info("Business fetched successfully", {
      businessId: foundBusiness.id,
    });

    return { data: { business: foundBusiness } };
  },
);

/**
 * PUT /api/clients/[id]/businesses/[businessId] - Update a business
 *
 * Security: Uses EXISTS subquery to atomically verify client ownership
 * in the same UPDATE statement, preventing TOCTOU race conditions.
 */
export const PUT = withApiHandler(
  {
    endpoint: "/api/clients/[id]/businesses/[businessId]",
    method: "PUT",
    resourceIdParams: ["businessId"],
  },
  async (request, { logger, session, clientId, resourceIds }) => {
    const businessId = resourceIds?.businessId;
    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 },
      );
    }

    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) {
      return bodyResult.error;
    }

    // Validate request body
    const validationResult = updateBusinessSchema.safeParse(bodyResult.body);
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

    const result = await updateResource({
      config: businessConfig,
      resourceId: businessId,
      clientId: clientId!,
      userId: session.user.id,
      updateData: validationResult.data,
      logger,
    });

    if (!result.success) return result.response;
    return { data: { business: result.data } };
  },
);

/**
 * DELETE /api/clients/[id]/businesses/[businessId] - Soft delete a business
 *
 * Security: Uses EXISTS subquery to atomically verify client ownership
 * in the same UPDATE statement, preventing TOCTOU race conditions.
 */
export const DELETE = withApiHandler(
  {
    endpoint: "/api/clients/[id]/businesses/[businessId]",
    method: "DELETE",
    resourceIdParams: ["businessId"],
  },
  async (_request, { logger, session, clientId, resourceIds }) => {
    const businessId = resourceIds?.businessId;
    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 },
      );
    }

    const result = await deleteResource({
      config: businessConfig,
      resourceId: businessId,
      clientId: clientId!,
      userId: session.user.id,
      logger,
    });

    if (!result.success) return result.response;
    return { data: { message: "Business deleted successfully" } };
  },
);
