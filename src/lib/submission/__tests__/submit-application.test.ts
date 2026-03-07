/**
 * @fileoverview Tests for the D2C submission orchestration.
 *
 * Covers the 7 required test paths from Issue #271:
 * 1. First valid submit succeeds
 * 2. Repeated submit does not create duplicate provider submissions
 * 3. Transient provider failure retries safely
 * 4. Permanent provider failure does not retry endlessly
 * 5. User-facing error messages are sanitized
 * 6. Audit logs do not include raw PII
 * 7. Idempotent handling of duplicate application creation (race condition)
 *
 * Uses mock DB and mock provider — no real database connection needed.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildIdempotencyKey, submitToProvider } from "../submit-application";
import type { CarrierProvider } from "@/lib/providers/carrier-provider";

// ============================================================================
// Mocks
// ============================================================================

/** Creates a mock carrier provider */
function createMockProvider(
  overrides?: Partial<CarrierProvider>,
): CarrierProvider {
  return {
    providerName: "mock",
    getEstimateRange: vi.fn().mockResolvedValue({
      lowMonthlyPremiumCad: 50,
      highMonthlyPremiumCad: 100,
      currency: "CAD",
      nonBinding: true,
    }),
    submitApplication: vi.fn().mockResolvedValue({
      submissionId: "mock-submission-id",
      status: "submitted",
      submittedAt: "2026-01-15T12:00:00.000Z",
    }),
    getApplicationStatus: vi.fn().mockResolvedValue({
      submissionId: "mock-submission-id",
      status: "submitted",
      events: [],
    }),
    verifyWebhook: vi.fn().mockResolvedValue({ ok: true }),
    ...overrides,
  };
}

/**
 * Creates a mock database that simulates the application table.
 * Tracks inserts, updates, and queries in memory.
 */
function createMockDb() {
  const applications: Record<string, MockApp> = {};
  const events: MockEvent[] = [];

  type MockApp = {
    id: string;
    clientId: string;
    userId: string;
    idempotencyKey: string | null;
    providerKey: string | null;
    providerApplicationId: string | null;
    status: string;
    consentCapturedAt: Date | null;
    submittedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: null;
  };

  type MockEvent = {
    id: string;
    applicationId: string;
    status: string;
    source: string;
    metadata: Record<string, unknown> | null;
    occurredAt: Date;
    createdAt: Date;
  };

  let insertCounter = 0;

  const db = {
    query: {
      application: {
        findFirst: vi
          .fn()
          .mockImplementation(({ where }: { where: unknown }) => {
            // Simple mock: find by idempotency key or by id
            const key = extractIdempotencyKeyFromWhere(where);
            if (key) {
              const found = Object.values(applications).find(
                (a) => a.idempotencyKey === key && a.deletedAt === null,
              );
              return Promise.resolve(found ?? null);
            }
            const id = extractIdFromWhere(where);
            if (id) {
              const found = applications[id];
              return Promise.resolve(
                found && found.deletedAt === null ? found : null,
              );
            }
            return Promise.resolve(null);
          }),
      },
    },
    insert: vi.fn().mockImplementation(() => ({
      values: vi.fn().mockImplementation((vals: Partial<MockApp>) => ({
        returning: vi.fn().mockImplementation(() => {
          // Check unique constraint
          const existing = Object.values(applications).find(
            (a) => a.idempotencyKey === vals.idempotencyKey,
          );
          if (existing) {
            const error = Object.assign(new Error("unique_violation"), {
              code: "23505",
            });
            return Promise.reject(error);
          }

          const id = `app-${++insertCounter}`;
          const app: MockApp = {
            id,
            clientId: vals.clientId ?? "",
            userId: vals.userId ?? "",
            idempotencyKey: vals.idempotencyKey ?? null,
            providerKey: vals.providerKey ?? null,
            providerApplicationId: vals.providerApplicationId ?? null,
            status: vals.status ?? "draft",
            consentCapturedAt: null,
            submittedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          };
          applications[id] = app;

          // Check if this is an applicationEvent insert
          if ("applicationId" in vals && "source" in vals) {
            const event: MockEvent = {
              id: `evt-${events.length + 1}`,
              applicationId: (vals as unknown as MockEvent).applicationId,
              status: (vals as unknown as MockEvent).status,
              source: (vals as unknown as MockEvent).source,
              metadata: (vals as unknown as MockEvent).metadata ?? null,
              occurredAt: new Date(),
              createdAt: new Date(),
            };
            events.push(event);
            return Promise.resolve([event]);
          }

          return Promise.resolve([app]);
        }),
      })),
    })),
    update: vi.fn().mockImplementation(() => ({
      set: vi.fn().mockImplementation((setVals: Partial<MockApp>) => ({
        where: vi.fn().mockImplementation(() => ({
          returning: vi.fn().mockImplementation(() => {
            // Find the application to update (simplified: find draft app)
            const app = Object.values(applications).find(
              (a) => a.status === "draft" && a.deletedAt === null,
            );
            if (!app) return Promise.resolve([]);

            // Apply updates
            Object.assign(app, setVals, { updatedAt: new Date() });
            return Promise.resolve([app]);
          }),
        })),
      })),
    })),
    _applications: applications,
    _events: events,
  };

  return db;
}

// Where clause parsing helpers (simplified for mock)
function extractIdempotencyKeyFromWhere(_where: unknown): string | null {
  return null; // We'll override findFirst behavior per test
}

function extractIdFromWhere(_where: unknown): string | null {
  return null;
}

const CLIENT_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "user-123";
const DEFAULT_INPUT = {
  clientId: CLIENT_ID,
  userId: USER_ID,
  applicant: { firstName: "Test", lastName: "User" },
};

// ============================================================================
// buildIdempotencyKey
// ============================================================================

describe("buildIdempotencyKey", () => {
  it("produces deterministic key from clientId", () => {
    const key1 = buildIdempotencyKey(CLIENT_ID);
    const key2 = buildIdempotencyKey(CLIENT_ID);
    expect(key1).toBe(key2);
    expect(key1).toBe(`sub_${CLIENT_ID}`);
  });

  it("produces different keys for different clientIds", () => {
    const key1 = buildIdempotencyKey("aaa");
    const key2 = buildIdempotencyKey("bbb");
    expect(key1).not.toBe(key2);
  });
});

// ============================================================================
// submitToProvider
// ============================================================================

describe("submitToProvider", () => {
  let provider: CarrierProvider;
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    provider = createMockProvider();
    db = createMockDb();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Helper to advance timers so retries don't block. */
  async function runWithTimers<T>(promise: Promise<T>): Promise<T> {
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(10_000);
    }
    return promise;
  }

  // ---- Test 1: First valid submit succeeds ----
  it("first valid submit succeeds and records application", async () => {
    const result = await submitToProvider(DEFAULT_INPUT, provider, db as never);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.alreadySubmitted).toBe(false);
      expect(result.application.status).toBe("submitted");
      expect(result.application.providerKey).toBe("mock");
      expect(result.application.providerApplicationId).toBe(
        "mock-submission-id",
      );
    }
    expect(provider.submitApplication).toHaveBeenCalledTimes(1);
  });

  // ---- Test 2: Repeated submit does not create duplicate provider submissions ----
  it("repeated submit returns existing without calling provider again", async () => {
    // Pre-populate an already-submitted application
    db.query.application.findFirst.mockResolvedValue({
      id: "app-existing",
      clientId: CLIENT_ID,
      userId: USER_ID,
      idempotencyKey: `sub_${CLIENT_ID}`,
      status: "submitted",
      providerKey: "mock",
      providerApplicationId: "mock-submission-id",
      submittedAt: new Date(),
      consentCapturedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    const result = await submitToProvider(DEFAULT_INPUT, provider, db as never);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.alreadySubmitted).toBe(true);
    }
    // Provider should NOT be called for duplicate
    expect(provider.submitApplication).not.toHaveBeenCalled();
  });

  // ---- Test 3: Transient provider failure retries safely ----
  it("retries on transient provider failure", async () => {
    const transientError = new Error("ECONNRESET");
    (provider.submitApplication as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(transientError)
      .mockResolvedValue({
        submissionId: "mock-submission-id",
        status: "submitted",
        submittedAt: "2026-01-15T12:00:00.000Z",
      });

    const result = await runWithTimers(
      submitToProvider(DEFAULT_INPUT, provider, db as never),
    );

    expect(result.ok).toBe(true);
    // Should have been called twice: 1 failure + 1 success
    expect(provider.submitApplication).toHaveBeenCalledTimes(2);
  });

  // ---- Test 4: Permanent provider failure does not retry endlessly ----
  it("permanent failure stops immediately without retrying", async () => {
    const permanentError = Object.assign(new Error("Invalid application"), {
      statusCode: 400,
    });
    (provider.submitApplication as ReturnType<typeof vi.fn>).mockRejectedValue(
      permanentError,
    );

    const result = await submitToProvider(DEFAULT_INPUT, provider, db as never);

    expect(result.ok).toBe(false);
    // Should only be called once — no retry for 400 errors
    expect(provider.submitApplication).toHaveBeenCalledTimes(1);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_FAILED");
    }
  });

  // ---- Test 5: User-facing error messages are sanitized ----
  it("user-facing errors do not contain raw error details", async () => {
    const rawError = new Error(
      "PostgreSQL connection refused at 10.0.0.1:5432 for user admin",
    );
    Object.assign(rawError, { statusCode: 503 });
    (provider.submitApplication as ReturnType<typeof vi.fn>).mockRejectedValue(
      rawError,
    );

    const result = await runWithTimers(
      submitToProvider(DEFAULT_INPUT, provider, db as never),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.userMessage).not.toContain("PostgreSQL");
      expect(result.error.userMessage).not.toContain("10.0.0.1");
      expect(result.error.userMessage).not.toContain("5432");
      expect(result.error.userMessage).not.toContain("admin");
      expect(typeof result.error.code).toBe("string");
      expect(result.error.userMessage.length).toBeGreaterThan(10);
    }
  });

  // ---- Test 6: Audit logs do not include raw PII ----
  it("failure events do not contain PII in metadata", async () => {
    const rawError = new Error("Provider error with payload");
    Object.assign(rawError, { statusCode: 500 });
    (provider.submitApplication as ReturnType<typeof vi.fn>).mockRejectedValue(
      rawError,
    );

    // Track what gets inserted as events
    const insertedEvents: Array<Record<string, unknown>> = [];
    db.insert.mockImplementation(() => ({
      values: vi.fn().mockImplementation((vals: Record<string, unknown>) => ({
        returning: vi.fn().mockImplementation(() => {
          // If this looks like an event insert (has applicationId and source)
          if ("applicationId" in vals && "source" in vals) {
            insertedEvents.push(vals);
            return Promise.resolve([{ id: "evt-1", ...vals }]);
          }
          // Application insert
          const app = {
            id: "app-1",
            status: "draft",
            deletedAt: null,
            ...vals,
          };
          return Promise.resolve([app]);
        }),
      })),
    }));

    await runWithTimers(submitToProvider(DEFAULT_INPUT, provider, db as never));

    // Check that event metadata does not contain PII
    for (const event of insertedEvents) {
      const metadata = event.metadata as Record<string, unknown> | null;
      if (metadata) {
        expect(metadata).not.toHaveProperty("firstName");
        expect(metadata).not.toHaveProperty("lastName");
        expect(metadata).not.toHaveProperty("email");
        expect(metadata).not.toHaveProperty("ssn");
        expect(metadata).not.toHaveProperty("address");
        // Should have safe operational fields
        expect(metadata).toHaveProperty("providerKey");
      }
    }
  });

  // ---- Test 7: Race condition handled via unique constraint ----
  it("handles unique constraint violation gracefully (concurrent requests)", async () => {
    // First findFirst returns null (no existing)
    // Insert throws unique violation (another request won)
    // Second findFirst returns the winning request's record
    let findFirstCallCount = 0;
    db.query.application.findFirst.mockImplementation(() => {
      findFirstCallCount++;
      if (findFirstCallCount === 1) {
        return Promise.resolve(null); // First check: not found
      }
      // Second check (after unique violation): found
      return Promise.resolve({
        id: "app-winner",
        clientId: CLIENT_ID,
        userId: USER_ID,
        idempotencyKey: `sub_${CLIENT_ID}`,
        status: "submitted",
        providerKey: "mock",
        providerApplicationId: "mock-submission-id",
        submittedAt: new Date(),
        consentCapturedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
    });

    db.insert.mockImplementation(() => ({
      values: vi.fn().mockImplementation(() => ({
        returning: vi
          .fn()
          .mockRejectedValue(
            Object.assign(new Error("unique_violation"), { code: "23505" }),
          ),
      })),
    }));

    const result = await submitToProvider(DEFAULT_INPUT, provider, db as never);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.alreadySubmitted).toBe(true);
    }
    // Provider should NOT be called (the winner already submitted)
    expect(provider.submitApplication).not.toHaveBeenCalled();
  });

  // ---- Exhausted transient retries return PROVIDER_UNAVAILABLE ----
  it("returns PROVIDER_UNAVAILABLE when retries are exhausted", async () => {
    const transientError = new Error("ECONNREFUSED");
    (provider.submitApplication as ReturnType<typeof vi.fn>).mockRejectedValue(
      transientError,
    );

    const result = await runWithTimers(
      submitToProvider(DEFAULT_INPUT, provider, db as never),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PROVIDER_UNAVAILABLE");
    }
    // 1 initial + 2 retries = 3
    expect(provider.submitApplication).toHaveBeenCalledTimes(3);
  });
});
