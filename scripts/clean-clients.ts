/**
 * Script to clean all clients from the database
 * Run with: bun scripts/clean-clients.ts
 */

import { db } from "../src/server/db";
import { client } from "../src/server/db/schema";

async function cleanClients() {
  try {
    console.log("🧹 Cleaning clients table...");

    // eslint-disable-next-line drizzle/enforce-delete-with-where
    await db.delete(client);

    console.log("✅ All clients have been removed from the database");
  } catch (error) {
    console.error("❌ Error cleaning clients:", error);
    process.exit(1);
  }
}

cleanClients();
