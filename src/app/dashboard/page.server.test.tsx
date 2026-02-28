import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((path: string) => {
  throw new Error(`redirect:${path}`);
});
const getSessionMock = vi.fn();
const findProfileMock = vi.fn();
const findClientMock = vi.fn();

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
    },
  }),
}));

describe("DashboardPage session fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findProfileMock.mockResolvedValue({ accountType: "client" });
    findClientMock.mockResolvedValue(null);
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
  });
});
