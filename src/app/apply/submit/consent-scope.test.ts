/**
 * Regression test: consent submission must update only the targeted client row.
 *
 * Scenario: a user has two active (non-deleted) client records.  Submitting
 * consent for one specific clientId must NOT touch the other row.
 *
 * The test captures the arguments passed to drizzle's `.where()` and verifies
 * the `eq(client.id, clientId)` predicate is present, ensuring the UPDATE is
 * scoped to a single row.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Stable UUIDs for the two "seeded" client rows
// ---------------------------------------------------------------------------
const CLIENT_A_ID = "aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CLIENT_B_ID = "bbbb0000-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const USER_ID = "u-owner";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const redirectMock = vi.fn((path: string) => {
  throw new Error(`redirect:${path}`);
});
const getSessionMock = vi.fn();

// Track the arguments passed to `eq()` so we can assert which id was targeted
const eqMock = vi.fn(
  (col: string, val: string) => `eq(${String(col)},${String(val)})`,
);
const andMock = vi.fn((...args: unknown[]) => args);
const isNullMock = vi.fn((col: string) => `isNull(${String(col)})`);

// Drizzle update chain mock
const returningMock = vi.fn();
const whereMock = vi.fn(() => ({ returning: returningMock }));
const setMock = vi.fn(() => ({ where: whereMock }));
const updateMock = vi.fn(() => ({ set: setMock }));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}));

vi.mock("@/server/better-auth/server", () => ({
  getSession: () => getSessionMock(),
}));

vi.mock("@/server/db", () => ({
  getDb: () => ({ update: updateMock }),
}));

vi.mock("@/server/db/schemas", () => ({
  client: {
    id: "id",
    userId: "userId",
    deletedAt: "deletedAt",
    createdAt: "createdAt",
    consentTransmitToCarrierAt: "consentTransmitToCarrierAt",
    healthInfoAuthorizationAt: "healthInfoAuthorizationAt",
    esignIntentAcknowledgedAt: "esignIntentAcknowledgedAt",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (...args: unknown[]) => eqMock(...(args as [string, string])),
  isNull: (...args: unknown[]) => isNullMock(...(args as [string])),
  and: (...args: unknown[]) => andMock(...args),
  sql: vi.fn().mockReturnValue({ isSqlExpr: true }),
}));

/** Call an async fn and catch redirect throws. */
async function callIgnoringRedirect(fn: () => Promise<unknown>) {
  try {
    await fn();
    return null;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("redirect:")) {
      return err.message;
    }
    throw err;
  }
}

/** Build a formData payload targeting a specific clientId. */
function buildConsentForm(clientId: string): FormData {
  const fd = new FormData();
  fd.set("consentTransmit", "true");
  fd.set("healthInfoAuth", "true");
  fd.set("esignIntent", "true");
  fd.set("consentConfirmed", "true");
  fd.set("clientId", clientId);
  return fd;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("consent submission scope — regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ user: { id: USER_ID } });
    // Simulate exactly 1 row updated (the targeted row)
    returningMock.mockResolvedValue([{ id: CLIENT_A_ID }]);
  });

  it("includes eq(client.id, targetClientId) in the WHERE clause", async () => {
    const mod = await import("@/app/apply/submit/actions");

    await callIgnoringRedirect(() =>
      mod.submitApplicationAction(buildConsentForm(CLIENT_A_ID)),
    );

    // The where() builder must have been called exactly once
    expect(whereMock).toHaveBeenCalledTimes(1);

    // eq() must have been called with the client id column and the target UUID
    const eqCalls = eqMock.mock.calls as [string, string][];
    const idPredicate = eqCalls.find(
      ([col, val]) => col === "id" && val === CLIENT_A_ID,
    );
    expect(idPredicate).toBeDefined();
  });

  it("does NOT include the other client's id in the WHERE clause", async () => {
    const mod = await import("@/app/apply/submit/actions");

    await callIgnoringRedirect(() =>
      mod.submitApplicationAction(buildConsentForm(CLIENT_A_ID)),
    );

    const eqCalls = eqMock.mock.calls as [string, string][];
    const otherIdPredicate = eqCalls.find(
      ([col, val]) => col === "id" && val === CLIENT_B_ID,
    );
    expect(otherIdPredicate).toBeUndefined();
  });

  it("targets exactly the submitted clientId, leaving the other row untouched", async () => {
    const mod = await import("@/app/apply/submit/actions");

    // Submit for CLIENT_A only
    await callIgnoringRedirect(() =>
      mod.submitApplicationAction(buildConsentForm(CLIENT_A_ID)),
    );

    // Assert the WHERE clause targets CLIENT_A
    const eqCalls = eqMock.mock.calls as [string, string][];
    const targetedIds = eqCalls
      .filter(([col]) => col === "id")
      .map(([, val]) => val);
    expect(targetedIds).toEqual([CLIENT_A_ID]);

    // Assert ownership guard is still present
    const userIdPredicate = eqCalls.find(
      ([col, val]) => col === "userId" && val === USER_ID,
    );
    expect(userIdPredicate).toBeDefined();

    // Assert soft-delete guard is still present
    expect(isNullMock).toHaveBeenCalledWith("deletedAt");
  });

  it("rejects a submission that targets a clientId not belonging to the user (0 rows)", async () => {
    // Simulate: db returns 0 rows because clientId doesn't match any owned row
    returningMock.mockResolvedValue([]);
    const mod = await import("@/app/apply/submit/actions");

    const foreignId = "cccc0000-cccc-4ccc-8ccc-cccccccccccc";
    await callIgnoringRedirect(() =>
      mod.submitApplicationAction(buildConsentForm(foreignId)),
    );

    // Should redirect back to review
    expect(redirectMock).toHaveBeenCalledWith("/apply/review");
    expect(redirectMock).not.toHaveBeenCalledWith("/dashboard");
  });
});
