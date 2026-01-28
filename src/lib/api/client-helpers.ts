import { getDb } from "@/server/db";
import { client } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { UUID_REGEX } from "@/lib/validation/client";

/**
 * Validates UUID format and returns 400 response if invalid
 */
export function validateUUID(
  id: string,
  fieldName = "ID",
): NextResponse | null {
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: `Invalid ${fieldName} format` },
      { status: 400 },
    );
  }
  return null;
}

/**
 * Verifies that a client exists and belongs to the specified user
 * @returns The client if found, null otherwise
 */
export async function verifyClientOwnership(clientId: string, userId: string) {
  const db = getDb();

  const foundClient = await db.query.client.findFirst({
    where: and(
      eq(client.id, clientId),
      eq(client.userId, userId),
      isNull(client.deletedAt),
    ),
  });

  return foundClient;
}
