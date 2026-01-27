import { getSession } from "@/server/better-auth/server";
import { getDb } from "@/server/db";
import { client } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * UUID validation regex
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates UUID format and returns 400 response if invalid
 */
function validateUUID(id: string): NextResponse | null {
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: "Invalid client ID format" },
      { status: 400 },
    );
  }
  return null;
}

/**
 * Validation schema for updating a client (all fields optional)
 */
const updateClientSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  sex: z.enum(["M", "F"]).optional(),
  province: z
    .enum([
      "AB",
      "BC",
      "MB",
      "NB",
      "NL",
      "NS",
      "NT",
      "NU",
      "ON",
      "PE",
      "QC",
      "SK",
      "YT",
    ])
    .optional(),
  smoker: z.boolean().optional(),
  healthRating: z
    .enum([
      "preferred_plus",
      "preferred",
      "standard_plus",
      "standard",
      "substandard",
    ])
    .optional(),
  hasSpouse: z.boolean().optional(),
  spouseAge: z.number().int().min(0).max(120).optional(),
  clientIncome: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),
  spouseIncome: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),
  incomeReplacementPercent: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),
  replacementDurationYears: z.number().int().min(0).max(50).optional(),
  existingLifeInsuranceCoverage: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
});

/**
 * GET /api/clients/[id] - Get a single client by ID
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Validate UUID format
    const uuidError = validateUUID(id);
    if (uuidError) return uuidError;

    const db = getDb();

    // Fetch client with ownership verification
    const foundClient = await db.query.client.findFirst({
      where: and(
        eq(client.id, id),
        eq(client.userId, session.user.id),
        isNull(client.deletedAt),
      ),
    });

    if (!foundClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ client: foundClient });
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/clients/[id] - Update a client
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Validate UUID format
    const uuidError = validateUUID(id);
    if (uuidError) return uuidError;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Validate request body
    const validationResult = updateClientSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.format(),
        },
        { status: 400 },
      );
    }

    // Check if no fields were provided
    if (Object.keys(validationResult.data).length === 0) {
      return NextResponse.json(
        { error: "No fields provided for update" },
        { status: 400 },
      );
    }

    const db = getDb();

    // Update client with ownership and deletion check in WHERE clause
    const [updatedClient] = await db
      .update(client)
      .set({
        ...validationResult.data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(client.id, id),
          eq(client.userId, session.user.id),
          isNull(client.deletedAt),
        ),
      )
      .returning();

    if (!updatedClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ client: updatedClient });
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/clients/[id] - Soft delete a client
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Validate UUID format
    const uuidError = validateUUID(id);
    if (uuidError) return uuidError;

    const db = getDb();

    // Soft delete with ownership and deletion check in WHERE clause
    const [deletedClient] = await db
      .update(client)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(client.id, id),
          eq(client.userId, session.user.id),
          isNull(client.deletedAt),
        ),
      )
      .returning();

    if (!deletedClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Client deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
