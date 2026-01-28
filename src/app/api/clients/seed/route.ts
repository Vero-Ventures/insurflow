import { getDb } from "@/server/db";
import { client } from "@/server/db/schema";
import { createLogger } from "@/server/axiom";
import { NextResponse } from "next/server";
import { testClientsData } from "@/lib/test-data/clients";
import { validateSession } from "@/lib/api/route-helpers";

/**
 * POST /api/clients/seed - Seed test clients for development
 * Creates 10 sample clients for the authenticated user
 */
export async function POST() {
  const logger = createLogger({
    endpoint: "/api/clients/seed",
    method: "POST",
  });

  try {
    const sessionResult = await validateSession(logger);
    if ("error" in sessionResult) return sessionResult.error;
    const { session } = sessionResult;

    const { user } = session;
    logger.addContext({ userId: user.id });

    // Add userId to all test clients
    const clientsToInsert = testClientsData.map((c) => ({
      ...c,
      userId: user.id,
    }));

    const db = getDb();

    // Insert clients
    const inserted = await db
      .insert(client)
      .values(clientsToInsert)
      .returning();

    await logger.info("Test clients seeded successfully", {
      statusCode: 201,
      clientCount: inserted.length,
    });

    return NextResponse.json(
      {
        message: `Successfully created ${inserted.length} test clients`,
        clients: inserted,
      },
      { status: 201 },
    );
  } catch (error) {
    await logger.error(
      "Error seeding clients",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Failed to seed clients" },
      { status: 500 },
    );
  }
}
