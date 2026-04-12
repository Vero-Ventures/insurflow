import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  callIgnoringRedirect,
  createValidConsentForm,
  MOCK_CLIENT_SCHEMA,
  TEST_CLIENT_ID,
  TEST_REQUEST_ID,
  TEST_USER_ID,
} from "./__tests__/consent-test-helpers";

const redirectMock = vi.fn((path: string) => {
  // Simulate Next.js redirect() which always throws — prevents execution from
  // continuing past a redirect call, matching production behaviour.
  throw new Error(`redirect:${path}`);
});
const getSessionMock = vi.fn();
const headersMock = vi.fn();
const submitToProviderMock = vi.fn().mockResolvedValue({
  ok: true,
  alreadySubmitted: false,
});

// Drizzle update chain mock
const returningMock = vi
  .fn()
  .mockResolvedValue([{ id: "c1", firstName: "Test", lastName: "User" }]);
const whereMock = vi.fn(() => ({ returning: returningMock }));
const setMock = vi.fn(() => ({ where: whereMock }));
const updateMock = vi.fn(() => ({ set: setMock }));

// Mock query chain for idempotent repeat-click check
const findFirstMock = vi.fn().mockResolvedValue(null);
const estimateRunFindFirstMock = vi.fn().mockResolvedValue(null);
const queryMock = {
  client: { findFirst: findFirstMock },
  estimateRun: { findFirst: estimateRunFindFirstMock },
};

vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}));

vi.mock("@/server/better-auth/server", () => ({
  getSession: () => getSessionMock(),
}));

vi.mock("next/headers", () => ({
  headers: () => headersMock(),
}));

vi.mock("@/server/db", () => ({
  getDb: () => ({ update: updateMock, query: queryMock }),
}));

vi.mock("@/server/db/schemas", () => ({
  client: MOCK_CLIENT_SCHEMA,
  estimateRun: {
    id: "id",
    clientId: "clientId",
    userId: "userId",
    deletedAt: "deletedAt",
  },
}));

// Mock provider submission — best-effort, not tested here
vi.mock("@/lib/submission/submit-application", () => ({
  submitToProvider: (...args: unknown[]) => submitToProviderMock(...args),
}));

vi.mock("@/server/providers/get-carrier-provider", () => ({
  getCarrierProvider: vi.fn().mockReturnValue({ providerName: "mock" }),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  isNull: vi.fn(),
  and: vi.fn(),
  // Returns a sentinel so tests can assert COALESCE expressions are used
  sql: vi.fn().mockReturnValue({ isSqlExpr: true }),
}));

/** Helper: set up an authenticated session and return the actions module. */
async function loadActionsWithSession(userId = TEST_USER_ID) {
  getSessionMock.mockResolvedValue({ user: { id: userId } });
  return import("@/app/apply/submit/actions");
}

describe("ApplySubmitPage", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    getSessionMock.mockReset();
    headersMock.mockReset();
    updateMock.mockClear();
    setMock.mockClear();
    whereMock.mockClear();
    returningMock.mockClear();
    findFirstMock.mockClear();
    estimateRunFindFirstMock.mockClear();
    submitToProviderMock.mockClear();
    returningMock.mockResolvedValue([
      { id: "c1", firstName: "Test", lastName: "User" },
    ]);
    findFirstMock.mockResolvedValue(null);
    estimateRunFindFirstMock.mockResolvedValue(null);
    headersMock.mockResolvedValue(
      new Headers({ "x-request-id": TEST_REQUEST_ID }),
    );
  });

  it("redirects signed-out users to sign-up", async () => {
    getSessionMock.mockResolvedValue(null);

    const mod = await import("@/app/apply/submit/page");
    await callIgnoringRedirect(() => mod.default());

    expect(redirectMock).toHaveBeenCalledWith("/auth/sign-up?role=client");
  });

  it("renders confirmation page for signed-in users without mutating status", async () => {
    getSessionMock.mockResolvedValue({ user: { id: TEST_USER_ID } });

    const mod = await import("@/app/apply/submit/page");
    const page = await mod.default();

    expect(page).toBeTruthy();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  describe("submitApplicationAction", () => {
    it("redirects to sign-up when no session", async () => {
      getSessionMock.mockResolvedValue(null);
      const mod = await import("@/app/apply/submit/actions");

      await callIgnoringRedirect(() =>
        mod.submitApplicationAction(new FormData()),
      );

      expect(redirectMock).toHaveBeenCalledWith("/auth/sign-up?role=client");
    });

    it("redirects to review when consentTransmit is missing", async () => {
      const mod = await loadActionsWithSession();

      const formData = createValidConsentForm({ consentTransmit: undefined });
      await callIgnoringRedirect(() => mod.submitApplicationAction(formData));

      expect(redirectMock).toHaveBeenCalledWith("/apply/review");
    });

    it("redirects to review when healthInfoAuth is missing", async () => {
      const mod = await loadActionsWithSession();

      const formData = createValidConsentForm({ healthInfoAuth: undefined });
      await callIgnoringRedirect(() => mod.submitApplicationAction(formData));

      expect(redirectMock).toHaveBeenCalledWith("/apply/review");
    });

    it("redirects to review when esignIntent is missing", async () => {
      const mod = await loadActionsWithSession();

      const formData = createValidConsentForm({ esignIntent: undefined });
      await callIgnoringRedirect(() => mod.submitApplicationAction(formData));

      expect(redirectMock).toHaveBeenCalledWith("/apply/review");
    });

    it("redirects to review when final consentConfirmed is missing", async () => {
      const mod = await loadActionsWithSession();

      const formData = createValidConsentForm({ consentConfirmed: undefined });
      await callIgnoringRedirect(() => mod.submitApplicationAction(formData));

      expect(redirectMock).toHaveBeenCalledWith("/apply/review");
    });

    it("redirects to review when clientId is missing", async () => {
      const mod = await loadActionsWithSession();

      const formData = createValidConsentForm({ clientId: undefined });
      await callIgnoringRedirect(() => mod.submitApplicationAction(formData));

      expect(redirectMock).toHaveBeenCalledWith("/apply/review");
    });

    it("redirects to review when clientId is not a valid UUID", async () => {
      const mod = await loadActionsWithSession();

      const formData = createValidConsentForm({ clientId: "not-a-uuid" });
      await callIgnoringRedirect(() => mod.submitApplicationAction(formData));

      expect(redirectMock).toHaveBeenCalledWith("/apply/review");
    });

    it("redirects to review when estimateRunId is not a valid UUID", async () => {
      const mod = await loadActionsWithSession();

      const formData = createValidConsentForm({ estimateRunId: "not-a-uuid" });
      await callIgnoringRedirect(() => mod.submitApplicationAction(formData));

      expect(redirectMock).toHaveBeenCalledWith("/apply/review");
      expect(submitToProviderMock).not.toHaveBeenCalled();
    });

    it("passes a validated estimateRunId through to submission", async () => {
      const mod = await loadActionsWithSession();
      const estimateRunId = "00000000-0000-4000-8000-000000000099";
      estimateRunFindFirstMock.mockResolvedValue({
        id: estimateRunId,
        clientId: TEST_CLIENT_ID,
      });

      const formData = createValidConsentForm({ estimateRunId });
      await callIgnoringRedirect(() => mod.submitApplicationAction(formData));

      expect(submitToProviderMock).toHaveBeenCalledWith(
        expect.objectContaining({ estimateRunId }),
        expect.anything(),
        expect.anything(),
      );
    });

    it("persists consent timestamps and redirects to dashboard when all consents present", async () => {
      const mod = await loadActionsWithSession();

      const formData = createValidConsentForm();
      await callIgnoringRedirect(() => mod.submitApplicationAction(formData));

      // DB update was called
      expect(updateMock).toHaveBeenCalledTimes(1);
      expect(setMock).toHaveBeenCalledTimes(1);

      // Verify all three fields use SQL (COALESCE) expressions, not bare Date values
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const setCall = (setMock.mock.calls as any)[0][0] as Record<
        string,
        unknown
      >;
      expect(setCall).toHaveProperty("consentTransmitToCarrierAt");
      expect(setCall).toHaveProperty("healthInfoAuthorizationAt");
      expect(setCall).toHaveProperty("esignIntentAcknowledgedAt");
      // Must be SQL expressions — not raw Date objects
      expect(setCall.consentTransmitToCarrierAt).not.toBeInstanceOf(Date);
      expect(setCall.healthInfoAuthorizationAt).not.toBeInstanceOf(Date);
      expect(setCall.esignIntentAcknowledgedAt).not.toBeInstanceOf(Date);
      expect(setCall.consentTransmitToCarrierAt).toMatchObject({
        isSqlExpr: true,
      });
      expect(setCall.healthInfoAuthorizationAt).toMatchObject({
        isSqlExpr: true,
      });
      expect(setCall.esignIntentAcknowledgedAt).toMatchObject({
        isSqlExpr: true,
      });

      // Redirected to dashboard
      expect(redirectMock).toHaveBeenCalledWith("/dashboard");
      expect(submitToProviderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          recordConsentCapture: true,
          auditContext: {
            actorUserId: TEST_USER_ID,
            requestId: TEST_REQUEST_ID,
          },
        }),
        expect.anything(),
        expect.anything(),
      );
    });

    it("redirects to review when DB finds no matching client row (0 rows updated)", async () => {
      returningMock.mockResolvedValue([]);
      const mod = await loadActionsWithSession();

      const formData = createValidConsentForm();
      await callIgnoringRedirect(() => mod.submitApplicationAction(formData));

      expect(redirectMock).toHaveBeenCalledWith("/apply/review");
      expect(redirectMock).not.toHaveBeenCalledWith("/dashboard");
    });

    it("records consent capture on already-active retry submissions", async () => {
      returningMock.mockResolvedValue([]);
      findFirstMock.mockResolvedValue({
        id: "c1",
        firstName: "Test",
        lastName: "User",
      });

      const mod = await loadActionsWithSession();

      await callIgnoringRedirect(() =>
        mod.submitApplicationAction(createValidConsentForm()),
      );

      expect(submitToProviderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          recordConsentCapture: true,
          auditContext: {
            actorUserId: TEST_USER_ID,
            requestId: TEST_REQUEST_ID,
          },
        }),
        expect.anything(),
        expect.anything(),
      );
      expect(redirectMock).toHaveBeenCalledWith("/dashboard");
    });
  });
});
