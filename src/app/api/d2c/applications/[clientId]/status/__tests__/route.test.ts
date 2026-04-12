/**
 * @fileoverview Unit tests for GET /api/d2c/applications/[clientId]/status.
 *
 * Tests authentication, authorization, input validation, and data retrieval
 * for the application status endpoint.
 *
 * @see Issue #269
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

import {
  createMockSession,
  TEST_UUIDS,
} from "@/lib/api/__tests__/helpers/d2c-resume-link-test-helpers";

// ============================================================================
// Mock Setup
// ============================================================================

const { mockGetSession, mockProfileFindFirst, mockFindApplicationStatus } =
  vi.hoisted(() => ({
    mockGetSession: vi.fn(),
    mockProfileFindFirst: vi.fn(),
    mockFindApplicationStatus: vi.fn(),
  }));

vi.mock("@/server/better-auth/server", () => ({
  getSession: () => mockGetSession(),
}));

vi.mock("@/server/db", () => ({
  getDb: vi.fn(() => ({
    query: {
      userProfile: {
        findFirst: mockProfileFindFirst,
      },
    },
  })),
}));

vi.mock("@/lib/api/d2c-application-helpers", () => ({
  findApplicationStatus: (...args: unknown[]) =>
    mockFindApplicationStatus(...args),
}));

vi.mock("@/server/axiom", () => ({
  createLogger: vi.fn(() => ({
    addContext: vi.fn(),
    info: vi.fn(async () => undefined),
    warn: vi.fn(async () => undefined),
    error: vi.fn(async () => undefined),
  })),
}));

// ============================================================================
// Test Data Factories
// ============================================================================

const TEST_APPLICATION_ID = "550e8400-e29b-41d4-a716-446655440010";

function createMockApplicationResult(overrides: Record<string, unknown> = {}) {
  return {
    found: true as const,
    application: {
      id: TEST_APPLICATION_ID,
      clientId: TEST_UUIDS.validClientId,
      status: "submitted",
      providerKey: "mock",
      submittedAt: new Date("2026-03-01T10:00:00Z").toISOString(),
      createdAt: new Date("2026-03-01T09:00:00Z").toISOString(),
      updatedAt: new Date("2026-03-01T10:00:00Z").toISOString(),
      ...overrides,
    },
    timeline: [],
  };
}

function createMockTimelineEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "550e8400-e29b-41d4-a716-446655440020",
    status: "submitted",
    source: "consumer",
    occurredAt: new Date("2026-03-01T10:00:00Z").toISOString(),
    metadata: null,
    createdAt: new Date("2026-03-01T10:00:00Z").toISOString(),
    ...overrides,
  };
}

// ============================================================================
// Request Helper
// ============================================================================

async function getStatus(clientId: string) {
  return GET(
    new Request(`http://localhost/api/d2c/applications/${clientId}/status`, {
      method: "GET",
    }),
    { params: Promise.resolve({ clientId }) },
  );
}

// ============================================================================
// Tests
// ============================================================================

describe("GET /api/d2c/applications/[clientId]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(createMockSession(TEST_UUIDS.validUserId));
    mockProfileFindFirst.mockResolvedValue({ accountType: "client" });
  });

  // --------------------------------------------------------------------------
  // Auth & authorization
  // --------------------------------------------------------------------------

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await getStatus(TEST_UUIDS.validClientId);

    expect(response.status).toBe(401);
  });

  it("allows advisor accounts", async () => {
    mockProfileFindFirst.mockResolvedValue({ accountType: "advisor" });
    mockFindApplicationStatus.mockResolvedValue(createMockApplicationResult());

    const response = await getStatus(TEST_UUIDS.validClientId);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.application).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // Input validation
  // --------------------------------------------------------------------------

  it("returns 400 for invalid client ID format", async () => {
    const response = await getStatus("not-a-uuid");

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Invalid client ID");
  });

  // --------------------------------------------------------------------------
  // Happy path
  // --------------------------------------------------------------------------

  it("returns 200 with application and empty timeline", async () => {
    const result = createMockApplicationResult();
    mockFindApplicationStatus.mockResolvedValue(result);

    const response = await getStatus(TEST_UUIDS.validClientId);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.application).toBeDefined();
    expect(body.application.id).toBe(TEST_APPLICATION_ID);
    expect(body.application.status).toBe("submitted");
    expect(body.timeline).toEqual([]);
  });

  it("returns 200 with application and timeline events", async () => {
    const events = [
      createMockTimelineEvent({
        id: "event-1",
        status: "submitted",
        source: "consumer",
      }),
      createMockTimelineEvent({
        id: "event-2",
        status: "received",
        source: "provider",
      }),
    ];
    const result = {
      ...createMockApplicationResult({ status: "received" }),
      timeline: events,
    };
    mockFindApplicationStatus.mockResolvedValue(result);

    const response = await getStatus(TEST_UUIDS.validClientId);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.timeline).toHaveLength(2);
    expect(body.application.status).toBe("received");
  });

  it("passes clientId and userId to the helper", async () => {
    mockFindApplicationStatus.mockResolvedValue(createMockApplicationResult());

    await getStatus(TEST_UUIDS.validClientId);

    expect(mockFindApplicationStatus).toHaveBeenCalledWith(
      TEST_UUIDS.validClientId,
      TEST_UUIDS.validUserId,
    );
  });

  // --------------------------------------------------------------------------
  // Not found
  // --------------------------------------------------------------------------

  it("returns 404 when application is not found", async () => {
    mockFindApplicationStatus.mockResolvedValue({ found: false });

    const response = await getStatus(TEST_UUIDS.validClientId);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toContain("Application not found");
  });
});
