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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when endpoint requires advisor role", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockResolvedValue({ accountType: "client" });

    const handler = withApiHandler(
      {
        endpoint: "/api/test",
        method: "GET",
        requireAdvisor: true,
      },
      async () => ({ data: { ok: true } }),
    );

    const response = await handler(new Request("http://localhost"), {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Advisor account required",
    });
  });

  it("allows advisor through when role matches", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockFindFirst.mockResolvedValue({ accountType: "advisor" });

    const handler = withApiHandler(
      {
        endpoint: "/api/test",
        method: "GET",
        requireAdvisor: true,
      },
      async () => ({ data: { ok: true } }),
    );

    const response = await handler(new Request("http://localhost"), {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
