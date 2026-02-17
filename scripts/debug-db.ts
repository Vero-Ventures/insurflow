/**
 * Debug script to check users and clients in database
 */

import { getDb } from "../src/server/db";
import type { InferSelectModel } from "drizzle-orm";
import type { user, client } from "../src/server/db/schemas";

type User = InferSelectModel<typeof user>;
type Client = InferSelectModel<typeof client>;

async function debug() {
  console.log("Checking database...\n");

  const db = getDb();

  // Get all users
  const users: User[] = await db.query.user.findMany();
  console.log(`Found ${users.length} users:`);
  users.forEach((u: User) => {
    console.log(`   - ${u.email} (ID: ${u.id})`);
  });

  console.log("");

  // Get all clients
  const clients: Client[] = await db.query.client.findMany();
  console.log(`Found ${clients.length} clients:`);
  clients.forEach((c: Client) => {
    console.log(`   - ${c.firstName} ${c.lastName} (User ID: ${c.userId})`);
  });
}

debug();
