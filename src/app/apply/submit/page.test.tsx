import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn();
const setCookieMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ set: setCookieMock }),
}));

vi.mock("@/server/better-auth/server", () => ({
  getSession: () => getSessionMock(),
}));

describe("ApplySubmitPage", () => {
  beforeEach(() => {
    redirectMock.mockReset();
    setCookieMock.mockReset();
    getSessionMock.mockReset();
  });

  it("redirects signed-out users to sign-up", async () => {
    getSessionMock.mockResolvedValue(null);

    const mod = await import("@/app/apply/submit/page");
    await mod.default();

    expect(redirectMock).toHaveBeenCalledWith("/auth/sign-up?role=client");
  });

  it("sets status cookie and redirects signed-in users", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1" } });

    const mod = await import("@/app/apply/submit/page");
    await mod.default();

    expect(setCookieMock).toHaveBeenCalledWith(
      "insurflow_application_status",
      "submitted",
      expect.objectContaining({ path: "/" }),
    );
    expect(redirectMock).toHaveBeenLastCalledWith("/dashboard");
  });
});
