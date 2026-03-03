import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

vi.mock("@/server/better-auth/server", () => ({
  getSession: () => getSessionMock(),
}));

describe("ApplySubmitPage", () => {
  beforeEach(() => {
    redirectMock.mockReset();
    getSessionMock.mockReset();
  });

  it("redirects signed-out users to sign-up", async () => {
    getSessionMock.mockResolvedValue(null);

    const mod = await import("@/app/apply/submit/page");
    await mod.default();

    expect(redirectMock).toHaveBeenCalledWith("/auth/sign-up?role=client");
  });

  it("renders confirmation page for signed-in users without mutating status", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1" } });

    const mod = await import("@/app/apply/submit/page");
    const page = await mod.default();

    expect(page).toBeTruthy();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("requires consent when submitting application", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1" } });

    const mod = await import("@/app/apply/submit/page");
    const formData = new FormData();
    await mod.submitApplicationAction(formData);

    expect(redirectMock).toHaveBeenCalledWith("/apply/review");
  });

  it("redirects to dashboard when consent is present", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1" } });

    const mod = await import("@/app/apply/submit/page");
    const formData = new FormData();
    formData.set("consentConfirmed", "true");
    await mod.submitApplicationAction(formData);

    expect(redirectMock).toHaveBeenLastCalledWith("/dashboard");
  });
});
