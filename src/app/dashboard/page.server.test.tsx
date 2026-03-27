import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((path: string) => {
  throw new Error(`redirect:${path}`);
});
const getSessionMock = vi.fn();
const findProfileMock = vi.fn();
const findClientMock = vi.fn();
const findApplicationMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/server/better-auth/server", () => ({
  getSession: getSessionMock,
}));

vi.mock("@/server/db", () => ({
  getDb: () => ({
    query: {
      userProfile: {
        findFirst: findProfileMock,
      },
      client: {
        findFirst: findClientMock,
      },
      application: {
        findFirst: findApplicationMock,
      },
    },
  }),
}));

describe("DashboardPage session fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findProfileMock.mockResolvedValue({ accountType: "client" });
    findClientMock.mockResolvedValue(null);
    findApplicationMock.mockResolvedValue(null);
  });

  it("uses session.session.userId when session.user.id is missing", async () => {
    getSessionMock.mockResolvedValue({
      user: { name: "Advisor" },
      session: { userId: "user_123" },
    });

    const { default: DashboardPage } = await import("./page");
    const page = await DashboardPage();

    expect(page).toBeTruthy();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(findProfileMock).toHaveBeenCalledTimes(1);
    expect(findClientMock).toHaveBeenCalledTimes(1);
  }, 15000);
});

describe("DashboardPage missing profile guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findClientMock.mockResolvedValue(null);
    findApplicationMock.mockResolvedValue(null);
  });

  it("redirects to /onboarding when user has no profile", async () => {
    getSessionMock.mockResolvedValue({
      user: { id: "user_456", name: "New User" },
      session: { userId: "user_456" },
    });
    findProfileMock.mockResolvedValue(null);

    const { default: DashboardPage } = await import("./page");

    await expect(DashboardPage()).rejects.toThrow("redirect:/onboarding");
    expect(redirectMock).toHaveBeenCalledWith("/onboarding");
  }, 15000);

  it("renders successfully when profile exists", async () => {
    getSessionMock.mockResolvedValue({
      user: { id: "user_789", name: "Complete User" },
      session: { userId: "user_789" },
    });
    findProfileMock.mockResolvedValue({ accountType: "client" });

    const { default: DashboardPage } = await import("./page");
    const page = await DashboardPage();

    expect(page).toBeTruthy();
    expect(redirectMock).not.toHaveBeenCalled();
  }, 15000);
});
