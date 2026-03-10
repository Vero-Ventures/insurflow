/**
 * @fileoverview Unit tests for D2C application status helper functions.
 *
 * Tests the database queries for retrieving application status and
 * timeline events. Uses mock factories from shared test helpers.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { findApplicationStatus } from "../d2c-application-helpers";
import { TEST_UUIDS } from "./helpers/d2c-resume-link-test-helpers";

// ============================================================================
// Mock Setup
// ============================================================================

const mockClientFindFirst = vi.fn();
const mockApplicationFindFirst = vi.fn();
const mockSelect = vi.fn();

/** Chainable mock for select().from().where().orderBy() */
const mockSelectFrom = vi.fn().mockReturnThis();
const mockSelectWhere = vi.fn().mockReturnThis();
const mockSelectOrderBy = vi.fn().mockResolvedValue([]);

mockSelect.mockReturnValue({ from: mockSelectFrom });
mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
mockSelectWhere.mockReturnValue({ orderBy: mockSelectOrderBy });

vi.mock("@/server/db", () => ({
  getDb: vi.fn(() => ({
    query: {
      client: { findFirst: mockClientFindFirst },
      application: { findFirst: mockApplicationFindFirst },
    },
    select: mockSelect,
  })),
}));

// ============================================================================
// Test Data Factories
// ============================================================================

const TEST_APPLICATION_ID = "550e8400-e29b-41d4-a716-446655440010";

function createMockApplication(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_APPLICATION_ID,
    clientId: TEST_UUIDS.validClientId,
    status: "submitted",
    providerKey: "mock",
    submittedAt: new Date("2026-03-01T10:00:00Z"),
    createdAt: new Date("2026-03-01T09:00:00Z"),
    updatedAt: new Date("2026-03-01T10:00:00Z"),
    ...overrides,
  };
}

function createMockTimelineEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "550e8400-e29b-41d4-a716-446655440020",
    status: "submitted",
    source: "consumer",
    occurredAt: new Date("2026-03-01T10:00:00Z"),
    metadata: null,
    createdAt: new Date("2026-03-01T10:00:00Z"),
    ...overrides,
  };
}

// ============================================================================
// findApplicationStatus
// ============================================================================

describe("findApplicationStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset select chain defaults
    mockSelect.mockReturnValue({ from: mockSelectFrom });
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
    mockSelectWhere.mockReturnValue({ orderBy: mockSelectOrderBy });
    mockSelectOrderBy.mockResolvedValue([]);
  });

  it("returns found: false when client does not exist", async () => {
    mockClientFindFirst.mockResolvedValue(null);

    const result = await findApplicationStatus(
      TEST_UUIDS.validClientId,
      TEST_UUIDS.validUserId,
    );

    expect(result.found).toBe(false);
    expect(mockApplicationFindFirst).not.toHaveBeenCalled();
  });

  it("returns found: false when client exists but no application", async () => {
    mockClientFindFirst.mockResolvedValue({ id: TEST_UUIDS.validClientId });
    mockApplicationFindFirst.mockResolvedValue(null);

    const result = await findApplicationStatus(
      TEST_UUIDS.validClientId,
      TEST_UUIDS.validUserId,
    );

    expect(result.found).toBe(false);
  });

  it("returns application and empty timeline when no events exist", async () => {
    const mockApp = createMockApplication();
    mockClientFindFirst.mockResolvedValue({ id: TEST_UUIDS.validClientId });
    mockApplicationFindFirst.mockResolvedValue(mockApp);
    mockSelectOrderBy.mockResolvedValue([]);

    const result = await findApplicationStatus(
      TEST_UUIDS.validClientId,
      TEST_UUIDS.validUserId,
    );

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.application.id).toBe(TEST_APPLICATION_ID);
      expect(result.application.status).toBe("submitted");
      expect(result.timeline).toHaveLength(0);
    }
  });

  it("returns application with timeline events in order", async () => {
    const mockApp = createMockApplication({ status: "in_review" });
    const event1 = createMockTimelineEvent({
      id: "event-1",
      status: "submitted",
      source: "consumer",
      occurredAt: new Date("2026-03-01T10:00:00Z"),
    });
    const event2 = createMockTimelineEvent({
      id: "event-2",
      status: "received",
      source: "provider",
      occurredAt: new Date("2026-03-01T11:00:00Z"),
    });
    const event3 = createMockTimelineEvent({
      id: "event-3",
      status: "in_review",
      source: "provider",
      occurredAt: new Date("2026-03-01T12:00:00Z"),
    });

    mockClientFindFirst.mockResolvedValue({ id: TEST_UUIDS.validClientId });
    mockApplicationFindFirst.mockResolvedValue(mockApp);
    mockSelectOrderBy.mockResolvedValue([event1, event2, event3]);

    const result = await findApplicationStatus(
      TEST_UUIDS.validClientId,
      TEST_UUIDS.validUserId,
    );

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.application.status).toBe("in_review");
      expect(result.timeline).toHaveLength(3);
      const [first, second, third] = result.timeline;
      expect(first!.status).toBe("submitted");
      expect(second!.status).toBe("received");
      expect(third!.status).toBe("in_review");
    }
  });

  it("includes metadata in timeline events when present", async () => {
    const metadata = { providerKey: "mock", previousStatus: "submitted" };
    const event = createMockTimelineEvent({ metadata });
    const mockApp = createMockApplication();

    mockClientFindFirst.mockResolvedValue({ id: TEST_UUIDS.validClientId });
    mockApplicationFindFirst.mockResolvedValue(mockApp);
    mockSelectOrderBy.mockResolvedValue([event]);

    const result = await findApplicationStatus(
      TEST_UUIDS.validClientId,
      TEST_UUIDS.validUserId,
    );

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.timeline).toHaveLength(1);
      expect(result.timeline[0]!.metadata).toEqual(metadata);
    }
  });

  it("returns providerKey and submittedAt in application summary", async () => {
    const submittedAt = new Date("2026-03-01T10:30:00Z");
    const mockApp = createMockApplication({
      providerKey: "mock",
      submittedAt,
    });

    mockClientFindFirst.mockResolvedValue({ id: TEST_UUIDS.validClientId });
    mockApplicationFindFirst.mockResolvedValue(mockApp);
    mockSelectOrderBy.mockResolvedValue([]);

    const result = await findApplicationStatus(
      TEST_UUIDS.validClientId,
      TEST_UUIDS.validUserId,
    );

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.application.providerKey).toBe("mock");
      expect(result.application.submittedAt).toEqual(submittedAt);
    }
  });

  it("returns null providerKey for draft applications", async () => {
    const mockApp = createMockApplication({
      status: "draft",
      providerKey: null,
      submittedAt: null,
    });

    mockClientFindFirst.mockResolvedValue({ id: TEST_UUIDS.validClientId });
    mockApplicationFindFirst.mockResolvedValue(mockApp);
    mockSelectOrderBy.mockResolvedValue([]);

    const result = await findApplicationStatus(
      TEST_UUIDS.validClientId,
      TEST_UUIDS.validUserId,
    );

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.application.providerKey).toBeNull();
      expect(result.application.submittedAt).toBeNull();
    }
  });
});
