import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";
import { client } from "@/server/db/schema";
import { NextResponse } from "next/server";

const testClients = [
  {
    firstName: "John",
    lastName: "Pork",
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
    firstName: "Sarah",
    lastName: "Pork",
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
    firstName: "Michael",
    lastName: "Pork",
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
  {
    firstName: "Jennifer",
    lastName: "Pork",
    dateOfBirth: "1988-02-14",
    sex: "F" as const,
    province: "MB" as const,
    smoker: false,
    healthRating: "preferred" as const,
    hasSpouse: false,
    clientIncome: "72000.00",
    status: "active" as const,
  },
  {
    firstName: "Robert",
    lastName: "Martinez",
    dateOfBirth: "1965-09-30",
    sex: "M" as const,
    province: "SK" as const,
    smoker: true,
    healthRating: "substandard" as const,
    hasSpouse: true,
    spouseAge: 58,
    clientIncome: "98000.00",
    spouseIncome: "45000.00",
    status: "active" as const,
  },
  {
    firstName: "Lisa",
    lastName: "Wilson",
    dateOfBirth: "1995-12-03",
    sex: "F" as const,
    province: "NB" as const,
    smoker: false,
    healthRating: "standard_plus" as const,
    hasSpouse: false,
    clientIncome: "55000.00",
    status: "draft" as const,
  },
  {
    firstName: "James",
    lastName: "Pork",
    dateOfBirth: "1982-06-25",
    sex: "M" as const,
    province: "PE" as const,
    smoker: false,
    healthRating: "preferred_plus" as const,
    hasSpouse: true,
    spouseAge: 39,
    clientIncome: "105000.00",
    spouseIncome: "82000.00",
    status: "active" as const,
  },
  {
    firstName: "Amanda",
    lastName: "Taylor",
    dateOfBirth: "1990-04-17",
    sex: "F" as const,
    province: "NL" as const,
    smoker: false,
    healthRating: "standard" as const,
    hasSpouse: false,
    clientIncome: "63000.00",
    status: "active" as const,
  },
];

/**
 * POST /api/clients/seed - Seed test clients for development
 * Creates 5 sample clients for the authenticated user
 */
export async function POST() {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = session;

    // Add userId to all test clients
    const clientsToInsert = testClients.map((c) => ({
      ...c,
      userId: user.id,
    }));

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
