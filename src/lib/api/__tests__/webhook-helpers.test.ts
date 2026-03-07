/**
 * @fileoverview Unit tests for webhook event persistence helpers.
 *
 * Tests idempotent event insertion, client existence checks, and
 * status update logic via mocked DB interactions.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NormalizedWebhookEvent } from "@/lib/providers/carrier-provider";

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
mockValues.mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
mockOnConflictDoNothing.mockReturnValue({ returning: mockReturning });
mockReturning.mockResolvedValue([]);
mockUpdate.mockReturnValue({ set: mockSet });
mockSet.mockReturnValue({ where: mockWhere });

vi.mock("@/server/db", () => ({
  getDb: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  })),
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
    deletedAt: "deleted_at",
    updatedAt: "updated_at",
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
    // Insert succeeds (new event)
    mockReturning
      .mockResolvedValueOnce([{ id: "new-event-id" }])
      // Update succeeds (latest event)
      .mockResolvedValueOnce([{ id: TEST_CLIENT_ID }]);

    const { persistWebhookEvent } = await import("@/lib/api/webhook-helpers");
    const result = await persistWebhookEvent("mock", createTestEvent());

    expect(result.persisted).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(result.statusUpdated).toBe(true);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "in_review" }),
    );
  });

  it("returns persisted but not statusUpdated when newer event already exists", async () => {
    // Client exists
    mockLimit.mockResolvedValueOnce([{ id: TEST_CLIENT_ID }]);
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
