/**
 * Debug script to check users and clients in database
 */

import { db } from "../src/server/db";

async function debug() {
  console.log("🔍 Checking database...\n");

  // Get all users
  const users = await db.query.user.findMany();
  console.log(`👥 Found ${users.length} users:`);
  users.forEach((u) => {
    console.log(`   - ${u.email} (ID: ${u.id})`);
  });

  console.log("");

  // Get all clients
  const clients = await db.query.client.findMany();
  console.log(`📋 Found ${clients.length} clients:`);
  clients.forEach((c) => {
    console.log(`   - ${c.firstName} ${c.lastName} (User ID: ${c.userId})`);
  });
}

debug();
