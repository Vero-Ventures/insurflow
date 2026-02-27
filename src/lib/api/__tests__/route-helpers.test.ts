import { beforeEach, describe, expect, it, vi } from "vitest";

import { withApiHandler } from "@/lib/api/route-helpers";

const { mockGetSession, mockFindFirst } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockFindFirst: vi.fn(),
}));

vi.mock("@/server/better-auth/server", () => ({
  getSession: mockGetSession,
}));

vi.mock("@/server/db", () => ({
  getDb: vi.fn(() => ({
    query: {
      userProfile: {
        findFirst: mockFindFirst,
      },
    },
  })),
}));

vi.mock("@/server/axiom", () => ({
  createLogger: vi.fn(() => ({
    addContext: vi.fn(),
    info: vi.fn(async () => undefined),
    warn: vi.fn(async () => undefined),
    error: vi.fn(async () => undefined),
  })),
}));

describe("withApiHandler advisor guard", () => {
  async function runAdvisorGuard(accountType: "advisor" | "client") {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockResolvedValue({ accountType });

    const handler = withApiHandler(
      {
        endpoint: "/api/test",
        method: "GET",
        requireAdvisor: true,
      },
      async () => ({ data: { ok: true } }),
    );

    return handler(new Request("http://localhost"), {
      params: Promise.resolve({}),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when endpoint requires advisor role", async () => {
    const response = await runAdvisorGuard("client");

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Advisor account required",
    });
  });

  it("allows advisor through when role matches", async () => {
    const response = await runAdvisorGuard("advisor");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
