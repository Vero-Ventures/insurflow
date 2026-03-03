import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((path: string) => {
  // Simulate Next.js redirect() which always throws — prevents execution from
  // continuing past a redirect call, matching production behaviour.
  throw new Error(`redirect:${path}`);
});
const getSessionMock = vi.fn();

// Drizzle update chain mock
const whereMock = vi.fn().mockResolvedValue([]);
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
    userId: "userId",
    deletedAt: "deletedAt",
    consentTransmitToCarrierAt: "consentTransmitToCarrierAt",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  isNull: vi.fn(),
  and: vi.fn(),
}));

/** Calls fn and catches redirect throws; returns the caught message or null. */
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

describe("ApplySubmitPage", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    getSessionMock.mockReset();
    updateMock.mockClear();
    setMock.mockClear();
    whereMock.mockClear();
    whereMock.mockResolvedValue([]);
  });

  it("redirects signed-out users to sign-up", async () => {
    getSessionMock.mockResolvedValue(null);

    const mod = await import("@/app/apply/submit/page");
    await callIgnoringRedirect(() => mod.default());

    expect(redirectMock).toHaveBeenCalledWith("/auth/sign-up?role=client");
  });

  it("renders confirmation page for signed-in users without mutating status", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1" } });

    const mod = await import("@/app/apply/submit/page");
    const page = await mod.default();

    expect(page).toBeTruthy();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  describe("submitApplicationAction", () => {
    it("redirects to sign-up when no session", async () => {
      getSessionMock.mockResolvedValue(null);
      const mod = await import("@/app/apply/submit/page");

      const formData = new FormData();
      await callIgnoringRedirect(() => mod.submitApplicationAction(formData));

      expect(redirectMock).toHaveBeenCalledWith("/auth/sign-up?role=client");
    });

    it("redirects to review when consentTransmit is missing", async () => {
      getSessionMock.mockResolvedValue({ user: { id: "u1" } });
      const mod = await import("@/app/apply/submit/page");

      const formData = new FormData();
      // consentTransmit intentionally omitted
      formData.set("healthInfoAuth", "true");
      formData.set("esignIntent", "true");
      formData.set("consentConfirmed", "true");
      await callIgnoringRedirect(() => mod.submitApplicationAction(formData));

      expect(redirectMock).toHaveBeenCalledWith("/apply/review");
    });

    it("redirects to review when healthInfoAuth is missing", async () => {
      getSessionMock.mockResolvedValue({ user: { id: "u1" } });
      const mod = await import("@/app/apply/submit/page");

      const formData = new FormData();
      formData.set("consentTransmit", "true");
      // healthInfoAuth intentionally omitted
      formData.set("esignIntent", "true");
      formData.set("consentConfirmed", "true");
      await callIgnoringRedirect(() => mod.submitApplicationAction(formData));

      expect(redirectMock).toHaveBeenCalledWith("/apply/review");
    });

    it("redirects to review when esignIntent is missing", async () => {
      getSessionMock.mockResolvedValue({ user: { id: "u1" } });
      const mod = await import("@/app/apply/submit/page");

      const formData = new FormData();
      formData.set("consentTransmit", "true");
      formData.set("healthInfoAuth", "true");
      // esignIntent intentionally omitted
      formData.set("consentConfirmed", "true");
      await callIgnoringRedirect(() => mod.submitApplicationAction(formData));

      expect(redirectMock).toHaveBeenCalledWith("/apply/review");
    });

    it("redirects to review when final consentConfirmed is missing", async () => {
      getSessionMock.mockResolvedValue({ user: { id: "u1" } });
      const mod = await import("@/app/apply/submit/page");

      const formData = new FormData();
      formData.set("consentTransmit", "true");
      formData.set("healthInfoAuth", "true");
      formData.set("esignIntent", "true");
      // consentConfirmed intentionally omitted
      await callIgnoringRedirect(() => mod.submitApplicationAction(formData));

      expect(redirectMock).toHaveBeenCalledWith("/apply/review");
    });

    it("persists consent timestamps and redirects to dashboard when all consents present", async () => {
      getSessionMock.mockResolvedValue({ user: { id: "u1" } });
      const mod = await import("@/app/apply/submit/page");

      const formData = new FormData();
      formData.set("consentTransmit", "true");
      formData.set("healthInfoAuth", "true");
      formData.set("esignIntent", "true");
      formData.set("consentConfirmed", "true");
      await callIgnoringRedirect(() => mod.submitApplicationAction(formData));

      // DB update was called
      expect(updateMock).toHaveBeenCalledTimes(1);
      expect(setMock).toHaveBeenCalledTimes(1);

      // Verify the three timestamp fields are set to Date instances
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const setCall = (setMock.mock.calls as any)[0][0] as Record<
        string,
        unknown
      >;
      expect(setCall).toHaveProperty("consentTransmitToCarrierAt");
      expect(setCall).toHaveProperty("healthInfoAuthorizationAt");
      expect(setCall).toHaveProperty("esignIntentAcknowledgedAt");
      expect(setCall.consentTransmitToCarrierAt).toBeInstanceOf(Date);
      expect(setCall.healthInfoAuthorizationAt).toBeInstanceOf(Date);
      expect(setCall.esignIntentAcknowledgedAt).toBeInstanceOf(Date);

      // Redirected to dashboard
      expect(redirectMock).toHaveBeenCalledWith("/dashboard");
    });

    it("all three consent timestamps are set to the same server time", async () => {
      getSessionMock.mockResolvedValue({ user: { id: "u1" } });
      const mod = await import("@/app/apply/submit/page");

      const formData = new FormData();
      formData.set("consentTransmit", "true");
      formData.set("healthInfoAuth", "true");
      formData.set("esignIntent", "true");
      formData.set("consentConfirmed", "true");
      await callIgnoringRedirect(() => mod.submitApplicationAction(formData));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const setCall = (setMock.mock.calls as any)[0][0] as {
        consentTransmitToCarrierAt: Date;
        healthInfoAuthorizationAt: Date;
        esignIntentAcknowledgedAt: Date;
      };

      // All timestamps share the same moment
      expect(setCall.consentTransmitToCarrierAt.getTime()).toBe(
        setCall.healthInfoAuthorizationAt.getTime(),
      );
      expect(setCall.consentTransmitToCarrierAt.getTime()).toBe(
        setCall.esignIntentAcknowledgedAt.getTime(),
      );
    });
  });
});
