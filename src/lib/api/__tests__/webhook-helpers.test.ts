/**
 * @fileoverview Unit tests for webhook event persistence helpers.
 *
 * Tests idempotent event insertion, client existence checks, and
 * status update logic via mocked DB interactions.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NormalizedWebhookEvent } from "@/lib/providers/carrier-provider";
import { TEST_APPLICATION_ID } from "./helpers/application-event-test-helpers";

// ============================================================================
// Mock Setup
// ============================================================================

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockOrderBy = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockOnConflictDoNothing = vi.fn();
const mockReturning = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockApplicationFindFirst = vi.fn();
const mockRecordApplicationLifecycleEvent = vi
  .fn()
  .mockResolvedValue(undefined);

// Chain builders
mockSelect.mockReturnValue({ from: mockFrom });
mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
mockWhere.mockReturnValue({
  limit: mockLimit,
  orderBy: mockOrderBy,
  returning: mockReturning,
});
mockOrderBy.mockReturnValue({ limit: mockLimit });
mockLimit.mockResolvedValue([]);
mockInsert.mockReturnValue({ values: mockValues });
mockValues.mockReturnValue({
  onConflictDoNothing: mockOnConflictDoNothing,
  returning: mockReturning,
});
mockOnConflictDoNothing.mockReturnValue({ returning: mockReturning });
mockReturning.mockResolvedValue([]);
mockUpdate.mockReturnValue({ set: mockSet });
mockSet.mockReturnValue({ where: mockWhere });

vi.mock("@/server/db", () => ({
  getDb: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    query: {
      application: {
        findFirst: mockApplicationFindFirst,
      },
    },
  })),
}));

vi.mock("@/server/audit/application-events", () => ({
  recordApplicationLifecycleEvent: (...args: unknown[]) =>
    mockRecordApplicationLifecycleEvent(...args),
}));

vi.mock("@/server/db/schemas", () => ({
  webhookEvent: {
    id: "id",
    clientId: "client_id",
    provider: "provider",
    providerEventId: "provider_event_id",
    status: "status",
    eventTimestamp: "event_timestamp",
    metadata: "metadata",
  },
  client: {
    id: "id",
    status: "status",
    deletedAt: "deleted_at",
    updatedAt: "updated_at",
  },
  application: {
    id: "id",
    clientId: "client_id",
    providerKey: "provider_key",
    status: "status",
    submittedAt: "submitted_at",
    createdAt: "created_at",
    deletedAt: "deleted_at",
    updatedAt: "updated_at",
  },
  applicationEvent: {
    id: "id",
  },
}));

// ============================================================================
// Test helpers
// ============================================================================

const TEST_CLIENT_ID = "550e8400-e29b-41d4-a716-446655440001";

function createTestEvent(
  overrides: Partial<NormalizedWebhookEvent> = {},
): NormalizedWebhookEvent {
  return {
    clientId: TEST_CLIENT_ID,
    providerEventId: "evt_001",
    status: "in_review",
    eventTimestamp: new Date("2025-06-15T10:30:00Z"),
    metadata: { note: "test" },
    ...overrides,
  };
}

function findLifecycleCall(eventName: string) {
  return mockRecordApplicationLifecycleEvent.mock.calls.find(
    ([input]) =>
      typeof input === "object" &&
      input !== null &&
      "event" in input &&
      input.event === eventName,
  )?.[0] as Record<string, unknown> | undefined;
}

// ============================================================================
// Tests
// ============================================================================

describe("persistWebhookEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain defaults
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    mockWhere.mockReturnValue({
      limit: mockLimit,
      orderBy: mockOrderBy,
      returning: mockReturning,
    });
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue([]);
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockReturnValue({
      onConflictDoNothing: mockOnConflictDoNothing,
    });
    mockOnConflictDoNothing.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([]);
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhere });
    mockApplicationFindFirst.mockResolvedValue(null);
    mockRecordApplicationLifecycleEvent.mockClear();
  });

  it("returns error when client does not exist", async () => {
    // Client check returns empty
    mockLimit.mockResolvedValueOnce([]);

    const { persistWebhookEvent } = await import("@/lib/api/webhook-helpers");
    const result = await persistWebhookEvent("mock", createTestEvent());

    expect(result.persisted).toBe(false);
    expect(result.duplicate).toBe(false);
    expect("error" in result && result.error).toBe("Client not found");
  });

  it("returns duplicate when ON CONFLICT returns no rows", async () => {
    // Client exists
    mockLimit.mockResolvedValueOnce([{ id: TEST_CLIENT_ID }]);
    // Insert returns nothing (duplicate)
    mockReturning.mockResolvedValueOnce([]);

    const { persistWebhookEvent } = await import("@/lib/api/webhook-helpers");
    const result = await persistWebhookEvent("mock", createTestEvent());

    expect(result.persisted).toBe(false);
    expect(result.duplicate).toBe(true);
    expect(result.statusUpdated).toBe(false);
  });

  it("returns persisted + statusUpdated when event is new and latest", async () => {
    // Client exists
    mockLimit.mockResolvedValueOnce([{ id: TEST_CLIENT_ID }]);
    mockApplicationFindFirst.mockResolvedValueOnce({
      id: TEST_APPLICATION_ID,
      status: "submitted",
    });
    // Insert succeeds (new event)
    mockReturning
      .mockResolvedValueOnce([{ id: "new-event-id" }])
      // Update succeeds (latest event)
      .mockResolvedValueOnce([
        { id: TEST_APPLICATION_ID, status: "in_review" },
      ]);

    const { persistWebhookEvent } = await import("@/lib/api/webhook-helpers");
    const result = await persistWebhookEvent("mock", createTestEvent(), {
      auditContext: {
        requestId: "req-webhook-1",
      },
    });

    expect(result.persisted).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(result.statusUpdated).toBe(true);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "in_review" }),
    );

    expect(findLifecycleCall("webhook_received")).toMatchObject({
      applicationId: TEST_APPLICATION_ID,
      source: "webhook",
      context: { requestId: "req-webhook-1" },
    });
    expect(findLifecycleCall("status_changed")).toMatchObject({
      applicationId: TEST_APPLICATION_ID,
      source: "provider",
      context: { requestId: "req-webhook-1" },
      metadata: expect.objectContaining({
        previousStatus: "submitted",
        providerEventId: "evt_001",
      }),
    });
  });

  it("returns persisted but not statusUpdated when newer event already exists", async () => {
    // Client exists
    mockLimit.mockResolvedValueOnce([{ id: TEST_CLIENT_ID }]);
    mockApplicationFindFirst.mockResolvedValueOnce({
      id: TEST_APPLICATION_ID,
      status: "submitted",
    });
    // Insert succeeds (new event)
    mockReturning
      .mockResolvedValueOnce([{ id: "new-event-id" }])
      // Update returns empty (newer event exists, condition not met)
      .mockResolvedValueOnce([]);

    const { persistWebhookEvent } = await import("@/lib/api/webhook-helpers");
    const result = await persistWebhookEvent("mock", createTestEvent());

    expect(result.persisted).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(result.statusUpdated).toBe(false);
    expect(findLifecycleCall("webhook_received")).toBeDefined();
    expect(findLifecycleCall("status_changed")).toBeUndefined();
  });
});

describe("clientExists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue([]);
  });

  it("returns true when client exists", async () => {
    mockLimit.mockResolvedValueOnce([{ id: TEST_CLIENT_ID }]);

    const { clientExists } = await import("@/lib/api/webhook-helpers");
    const result = await clientExists(TEST_CLIENT_ID);

    expect(result).toBe(true);
  });

  it("returns false when client does not exist", async () => {
    mockLimit.mockResolvedValueOnce([]);

    const { clientExists } = await import("@/lib/api/webhook-helpers");
    const result = await clientExists(TEST_CLIENT_ID);

    expect(result).toBe(false);
  });
});
