/**
 * Shared CRUD handler factories for business sub-resources.
 *
 * All business sub-resources (key people, shareholders, insurance needs)
 * share identical CRUD patterns differing only in table, schema, and naming.
 * These factories eliminate that duplication.
 *
 * @module business-resource-helpers
 */

import { getDb } from "@/server/db";
import type {
  keyPerson,
  shareholder,
  corporateInsuranceNeed,
} from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { z } from "zod";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";
import { verifyBusinessOwnership } from "@/lib/api/client-helpers";
import type { Logger } from "@/server/axiom";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Union of Drizzle tables that are direct children of a business. */
type BusinessSubResourceTable =
  | typeof keyPerson
  | typeof shareholder
  | typeof corporateInsuranceNeed;

/**
 * Hook invoked before a mutation (create / update).
 * Return a `NextResponse` to abort with an error, or `null` to proceed.
 */
export type MutationHook = (ctx: {
  businessId: string;
  resourceId?: string;
  validatedData: Record<string, unknown>;
  db: ReturnType<typeof getDb>;
  logger: Logger;
}) => Promise<NextResponse | null>;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Validates businessId presence and verifies business–client ownership.
 * Used by collection handlers (GET / POST).
 */
async function validateBusinessAccess(
  resourceIds: Record<string, string> | undefined,
  clientId: string | undefined,
  logger: Logger,
): Promise<{ businessId: string } | NextResponse> {
  const businessId = resourceIds?.businessId;
  if (!businessId) {
    return NextResponse.json(
      { error: "Business ID is required" },
      { status: 400 },
    );
  }

  const foundBusiness = await verifyBusinessOwnership(businessId, clientId!);
  if (!foundBusiness) {
    await logger.info("Business not found", { statusCode: 404 });
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  return { businessId };
}

/**
 * Validates businessId + resourceId presence and verifies business–client ownership.
 * Used by item handlers (PUT / DELETE).
 */
async function validateItemAccess(
  resourceIds: Record<string, string> | undefined,
  resourceIdParam: string,
  resourceName: string,
  clientId: string | undefined,
  logger: Logger,
): Promise<{ businessId: string; resourceId: string } | NextResponse> {
  const businessId = resourceIds?.businessId;
  const resourceId = resourceIds?.[resourceIdParam];
  if (!businessId || !resourceId) {
    return NextResponse.json(
      { error: `Business ID and ${resourceName} ID are required` },
      { status: 400 },
    );
  }

  const foundBusiness = await verifyBusinessOwnership(businessId, clientId!);
  if (!foundBusiness) {
    await logger.info("Business not found", { statusCode: 404 });
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  return { businessId, resourceId };
}

// ---------------------------------------------------------------------------
// Collection handlers factory (GET + POST)
// ---------------------------------------------------------------------------

interface CollectionConfig {
  /** API endpoint template (e.g., "/api/clients/[id]/businesses/[businessId]/key-people") */
  endpoint: string;
  /** Drizzle table reference */
  table: BusinessSubResourceTable;
  /** Human-readable resource name for messages (e.g., "Key person") */
  resourceName: string;
  /** Zod create schema */
  createSchema: z.ZodType;
  /** Optional hook called before insert (e.g., ownership % check) */
  beforeCreate?: MutationHook;
}

/**
 * Creates GET (list) and POST (create) handlers for a business sub-resource.
 */
export function createCollectionHandlers(config: CollectionConfig) {
  const { table, resourceName, endpoint, createSchema, beforeCreate } = config;

  // Use `any` to bypass Drizzle union-type constraints on table operations.
  // Column references (id, businessId, deletedAt) exist on all sub-resource tables.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = table as any;

  const GET = withApiHandler(
    {
      endpoint,
      method: "GET",
      requireClient: true,
      resourceIdParams: ["businessId"],
    },
    async (_request, { logger, clientId, resourceIds }) => {
      const access = await validateBusinessAccess(
        resourceIds,
        clientId,
        logger,
      );
      if (access instanceof NextResponse) return access;

      const db = getDb();
      const items = await db
        .select()
        .from(t)
        .where(and(eq(t.businessId, access.businessId), isNull(t.deletedAt)));

      await logger.info(`${resourceName}s fetched successfully`, {
        count: items.length,
      });

      return { data: { items } };
    },
  );

  const POST = withApiHandler(
    {
      endpoint,
      method: "POST",
      requireClient: true,
      resourceIdParams: ["businessId"],
    },
    async (request, { logger, clientId, resourceIds }) => {
      const access = await validateBusinessAccess(
        resourceIds,
        clientId,
        logger,
      );
      if (access instanceof NextResponse) return access;

      const bodyResult = await parseJsonBody(request, logger);
      if ("error" in bodyResult) return bodyResult.error;

      const validationResult = createSchema.safeParse(bodyResult.body);
      if (!validationResult.success) {
        return handleValidationError(logger, validationResult.error);
      }

      const db = getDb();
      const validatedData = validationResult.data as Record<string, unknown>;

      if (beforeCreate) {
        const hookResult = await beforeCreate({
          businessId: access.businessId,
          validatedData,
          db,
          logger,
        });
        if (hookResult) return hookResult;
      }

      const results = (await db
        .insert(t)
        .values({ businessId: access.businessId, ...validatedData })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .returning()) as any[];
      const newItem = results[0] as Record<string, unknown> | undefined;

      if (!newItem) {
        await logger.error(
          `Failed to create ${resourceName.toLowerCase()} - no result returned`,
        );
        return NextResponse.json(
          { error: `Failed to create ${resourceName.toLowerCase()}` },
          { status: 500 },
        );
      }

      await logger.info(`${resourceName} created successfully`, {
        resourceId: newItem.id,
      });

      return { data: { items: [newItem] }, status: 201 };
    },
  );

  return { GET, POST };
}

// ---------------------------------------------------------------------------
// Item handlers factory (PUT + DELETE)
// ---------------------------------------------------------------------------

interface ItemConfig {
  /** API endpoint template including resource ID (e.g., ".../key-people/[keyPersonId]") */
  endpoint: string;
  /** Drizzle table reference */
  table: BusinessSubResourceTable;
  /** Route param name for the resource ID (e.g., "keyPersonId") */
  resourceIdParam: string;
  /** Human-readable resource name for messages (e.g., "Key person") */
  resourceName: string;
  /** Key in the PUT response payload (e.g., "keyPerson") */
  responseKey: string;
  /** Zod update schema */
  updateSchema: z.ZodType;
  /** Optional hook called before update (after existence check) */
  beforeUpdate?: MutationHook;
}

/**
 * Creates PUT (update) and DELETE (soft-delete) handlers for a business sub-resource.
 */
export function createItemHandlers(config: ItemConfig) {
  const {
    table,
    resourceName,
    resourceIdParam,
    responseKey,
    endpoint,
    updateSchema,
    beforeUpdate,
  } = config;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = table as any;

  const PUT = withApiHandler(
    {
      endpoint,
      method: "PUT",
      requireClient: true,
      resourceIdParams: ["businessId", resourceIdParam],
    },
    async (request, { logger, clientId, resourceIds }) => {
      const access = await validateItemAccess(
        resourceIds,
        resourceIdParam,
        resourceName,
        clientId,
        logger,
      );
      if (access instanceof NextResponse) return access;

      const bodyResult = await parseJsonBody(request, logger);
      if ("error" in bodyResult) return bodyResult.error;

      const validationResult = updateSchema.safeParse(bodyResult.body);
      if (!validationResult.success) {
        return handleValidationError(logger, validationResult.error);
      }

      const data = validationResult.data as Record<string, unknown>;
      if (Object.keys(data).length === 0) {
        await logger.warn("No fields provided for update");
        return NextResponse.json(
          { error: "No fields provided for update" },
          { status: 400 },
        );
      }

      const db = getDb();

      // Existence check
      const [existing] = await db
        .select()
        .from(t)
        .where(
          and(
            eq(t.id, access.resourceId),
            eq(t.businessId, access.businessId),
            isNull(t.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        await logger.info(`${resourceName} not found`, { statusCode: 404 });
        return NextResponse.json(
          { error: `${resourceName} not found` },
          { status: 404 },
        );
      }

      if (beforeUpdate) {
        const hookResult = await beforeUpdate({
          businessId: access.businessId,
          resourceId: access.resourceId,
          validatedData: data,
          db,
          logger,
        });
        if (hookResult) return hookResult;
      }

      const [updated] = await db
        .update(t)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(
            eq(t.id, access.resourceId),
            eq(t.businessId, access.businessId),
            isNull(t.deletedAt),
          ),
        )
        .returning();

      if (!updated) {
        await logger.error(`Failed to update ${resourceName.toLowerCase()}`);
        return NextResponse.json(
          { error: `Failed to update ${resourceName.toLowerCase()}` },
          { status: 500 },
        );
      }

      await logger.info(`${resourceName} updated successfully`, {
        resourceId: (updated as Record<string, unknown>).id,
      });

      return { data: { [responseKey]: updated } };
    },
  );

  const DELETE = withApiHandler(
    {
      endpoint,
      method: "DELETE",
      requireClient: true,
      resourceIdParams: ["businessId", resourceIdParam],
    },
    async (_request, { logger, clientId, resourceIds }) => {
      const access = await validateItemAccess(
        resourceIds,
        resourceIdParam,
        resourceName,
        clientId,
        logger,
      );
      if (access instanceof NextResponse) return access;

      const db = getDb();
      const now = new Date();

      const [deleted] = await db
        .update(t)
        .set({ deletedAt: now, updatedAt: now })
        .where(
          and(
            eq(t.id, access.resourceId),
            eq(t.businessId, access.businessId),
            isNull(t.deletedAt),
          ),
        )
        .returning();

      if (!deleted) {
        await logger.info(`${resourceName} not found`, { statusCode: 404 });
        return NextResponse.json(
          { error: `${resourceName} not found` },
          { status: 404 },
        );
      }

      await logger.info(`${resourceName} deleted successfully`, {
        resourceId: (deleted as Record<string, unknown>).id,
      });

      return { data: { message: `${resourceName} deleted successfully` } };
    },
  );

  return { PUT, DELETE };
}
