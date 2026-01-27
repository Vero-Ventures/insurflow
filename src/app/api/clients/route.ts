import { getSession } from "@/server/better-auth/server";
import { getDb } from "@/server/db";
import { client } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Validation schema for creating a client
 */
const createClientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  sex: z.enum(["M", "F"]),
  province: z.enum([
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
  ]),
  smoker: z.boolean().default(false),
  healthRating: z
    .enum([
      "preferred_plus",
      "preferred",
      "standard_plus",
      "standard",
      "substandard",
    ])
    .default("standard"),
  hasSpouse: z.boolean().default(false),
  spouseAge: z.number().int().min(0).max(120).optional(),
  clientIncome: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid income format")
    .default("0"),
  spouseIncome: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid income format")
    .optional(),
  incomeReplacementPercent: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .default("70"),
  replacementDurationYears: z.number().int().min(0).max(50).default(10),
  existingLifeInsuranceCoverage: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .default("0"),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
});

/**
 * GET /api/clients - List all clients for the authenticated user
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    // Fetch all non-deleted clients for the current user
    const clients = await db.query.client.findMany({
      where: and(eq(client.userId, session.user.id), isNull(client.deletedAt)),
      orderBy: (client, { desc }) => [desc(client.createdAt)],
    });

    return NextResponse.json({ clients });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/clients - Create a new client
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Validate request body
    const validationResult = createClientSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.format(),
        },
        { status: 400 },
      );
    }

    const data = validationResult.data;
    const db = getDb();

    // Create client with ownership
    const [newClient] = await db
      .insert(client)
      .values({
        userId: session.user.id,
        ...data,
      })
      .returning();

    return NextResponse.json({ client: newClient }, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
