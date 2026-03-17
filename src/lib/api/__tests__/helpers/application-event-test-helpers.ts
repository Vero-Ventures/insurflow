import type { ApplicationStatus } from "@/server/db/schemas/applications-schema";

export const TEST_APPLICATION_ID = "550e8400-e29b-41d4-a716-446655440010";
export const TEST_CLIENT_ID = "550e8400-e29b-41d4-a716-446655440001";
export const TEST_USER_ID = "user-123";

export function createApplicationEventRow(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: "evt-1",
    applicationId: TEST_APPLICATION_ID,
    status: "draft" as ApplicationStatus,
    source: "consumer",
    occurredAt: new Date("2026-03-01T10:00:00.000Z"),
    metadata: null,
    createdAt: new Date("2026-03-01T10:00:00.000Z"),
    ...overrides,
  };
}

export function getEventNames(
  events: Array<Record<string, unknown>>,
): string[] {
  return events
    .map((event) => event.metadata as Record<string, unknown> | null)
    .map((metadata) => metadata?.event)
    .filter((value): value is string => typeof value === "string");
}

export function findEventByName(
  events: Array<Record<string, unknown>>,
  eventName: string,
) {
  return events.find(
    (event) =>
      (event.metadata as Record<string, unknown> | null)?.event === eventName,
  );
}
