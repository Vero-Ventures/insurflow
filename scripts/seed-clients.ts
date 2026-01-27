/**
 * Script to seed test clients into the database
 * Run with: bun run scripts/seed-clients.ts
 */

import { db } from "../src/server/db";
import { client } from "../src/server/db/schema";

const testClients = [
  {
    userId: "user_01", // Replace with actual user ID
    firstName: "John",
    lastName: "Smith",
    dateOfBirth: "1980-05-15",
    sex: "M" as const,
    province: "ON" as const,
    smoker: false,
    healthRating: "preferred" as const,
    hasSpouse: true,
    spouseAge: 45,
    clientIncome: "85000.00",
    status: "active" as const,
  },
  {
    userId: "user_01",
    firstName: "Sarah",
    lastName: "Johnson",
    dateOfBirth: "1985-08-22",
    sex: "F" as const,
    province: "BC" as const,
    smoker: false,
    healthRating: "preferred_plus" as const,
    hasSpouse: false,
    clientIncome: "95000.00",
    status: "active" as const,
  },
  {
    userId: "user_01",
    firstName: "Michael",
    lastName: "Chen",
    dateOfBirth: "1975-03-10",
    sex: "M" as const,
    province: "AB" as const,
    smoker: true,
    healthRating: "standard" as const,
    hasSpouse: true,
    spouseAge: 48,
    clientIncome: "120000.00",
    spouseIncome: "75000.00",
    status: "active" as const,
  },
  {
    userId: "user_01",
    firstName: "Emily",
    lastName: "Rodriguez",
    dateOfBirth: "1992-11-05",
    sex: "F" as const,
    province: "QC" as const,
    smoker: false,
    healthRating: "standard_plus" as const,
    hasSpouse: false,
    clientIncome: "68000.00",
    status: "draft" as const,
  },
  {
    userId: "user_01",
    firstName: "David",
    lastName: "Thompson",
    dateOfBirth: "1970-07-18",
    sex: "M" as const,
    province: "NS" as const,
    smoker: false,
    healthRating: "standard" as const,
    hasSpouse: true,
    spouseAge: 52,
    clientIncome: "110000.00",
    spouseIncome: "65000.00",
    status: "active" as const,
  },
];

async function seedClients() {
  try {
    console.log("🌱 Seeding test clients...");

    // Get the most recently created user (likely the one you're logged in as)
    const users = await db.query.user.findMany({
      orderBy: (users, { desc }) => [desc(users.createdAt)],
      limit: 1,
    });

    if (users.length === 0) {
      console.error(
        "❌ No users found in database. Please create a user first.",
      );
      process.exit(1);
    }

    const userId = users[0]!.id;
    console.log(
      `📝 Using most recent user: ${users[0]!.email} (ID: ${userId})`,
    );

    // Update all clients with the actual user ID
    const clientsToInsert = testClients.map((c) => ({
      ...c,
      userId,
    }));

    // Insert clients
    const inserted = await db
      .insert(client)
      .values(clientsToInsert)
      .returning();

    console.log(`✅ Successfully created ${inserted.length} test clients:`);
    inserted.forEach((c) => {
      console.log(`   - ${c.firstName} ${c.lastName} (${c.province})`);
    });
  } catch (error) {
    console.error("❌ Error seeding clients:", error);
    process.exit(1);
  }
}

seedClients();
