import { getSession } from "@/server/better-auth/server";
import { getDb } from "@/server/db";
import { client } from "@/server/db/schema";
import { NextResponse } from "next/server";
import { testClientsData } from "@/lib/test-data/clients";

/**
 * POST /api/clients/seed - Seed test clients for development
 * Creates 10 sample clients for the authenticated user
 */
export async function POST() {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = session;

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

    return NextResponse.json(
      {
        message: `Successfully created ${inserted.length} test clients`,
        clients: inserted,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error seeding clients:", error);
    return NextResponse.json(
      { error: "Failed to seed clients" },
      { status: 500 },
    );
  }
}
