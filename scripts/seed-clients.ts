/**
 * Script to seed test clients into the database
 * Run with: bun run scripts/seed-clients.ts
 */

import { desc } from "drizzle-orm";
import { getDb } from "../src/server/db";
import { client, user } from "../src/server/db/schema";
import { testClientsData } from "../src/lib/test-data/clients";

async function seedClients() {
  try {
    console.log("Seeding test clients...");

    const db = getDb();

    // Get the most recently created user (likely the one you're logged in as)
    const users = await db.query.user.findMany({
      orderBy: [desc(user.createdAt)],
      limit: 1,
    });

    if (users.length === 0) {
      console.error("No users found in database. Please create a user first.");
      process.exit(1);
    }

    const firstUser = users[0]!;
    const userId = firstUser.id;
    console.log(`Using most recent user: ${firstUser.email} (ID: ${userId})`);

    // Update all clients with the actual user ID
    const clientsToInsert = testClientsData.map((c) => ({
      ...c,
      userId,
    }));

    // Insert clients
    const inserted = await db
      .insert(client)
      .values(clientsToInsert)
      .returning();

    console.log(`Successfully created ${inserted.length} test clients:`);
    for (const c of inserted) {
      console.log(`   - ${c.firstName} ${c.lastName} (${c.state})`);
    }
  } catch (error) {
    console.error("Error seeding clients:", error);
    process.exit(1);
  }
}

seedClients();
