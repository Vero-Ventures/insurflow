/**
 * Script to clean all clients from the database
 * Run with: bun scripts/clean-clients.ts
 */

import { getDb } from "../src/server/db";
import { client } from "../src/server/db/schemas";

async function cleanClients() {
  try {
    console.log("Cleaning clients table...");

    const db = getDb();
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    await db.delete(client);

    console.log("All clients have been removed from the database");
  } catch (error) {
    console.error("Error cleaning clients:", error);
    process.exit(1);
  }
}

cleanClients();
