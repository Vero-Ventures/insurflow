import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((path: string) => {
  throw new Error(`redirect:${path}`);
});
const getSessionMock = vi.fn();
const findFirstMock = vi.fn();

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
        findFirst: findFirstMock,
      },
    },
  }),
}));

describe("DashboardPage session fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findFirstMock.mockResolvedValue({ accountType: "client" });
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
    expect(findFirstMock).toHaveBeenCalledTimes(1);
  });
});
