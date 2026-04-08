import { beforeEach, describe, expect, it, vi } from "vitest";

import { withApiHandler } from "@/lib/api/route-helpers";

const { mockCreateLogger, mockGetSession, mockFindFirst, mockLogger } =
  vi.hoisted(() => ({
    mockCreateLogger: vi.fn(),
    mockGetSession: vi.fn(),
    mockFindFirst: vi.fn(),
    mockLogger: {
      addContext: vi.fn(),
      info: vi.fn(async () => undefined),
      warn: vi.fn(async () => undefined),
      error: vi.fn(async () => undefined),
    },
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
  createLogger: mockCreateLogger,
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
    mockCreateLogger.mockReturnValue(mockLogger);
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

  it("handles static routes when Next omits route context", async () => {
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

    const response = await handler(new Request("http://localhost/api/test"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("adds request correlation and duration to endpoint logs", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });

    const handler = withApiHandler(
      {
        endpoint: "/api/test",
        method: "GET",
      },
      async () => ({ data: { ok: true } }),
    );

    const response = await handler(
      new Request("http://localhost/api/test", {
        headers: {
          "x-request-id": "req-123",
          "user-agent": "vitest",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("req-123");
    expect(mockCreateLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: "/api/test",
        method: "GET",
        requestId: "req-123",
        routePattern: "/api/test",
        userAgent: "vitest",
      }),
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      "API response returned",
      expect.objectContaining({
        statusCode: 200,
        duration: expect.any(Number),
        contentType: "application/json",
        isJson: true,
      }),
    );
  });

  it("emits a final response log for advisor authorization failures", async () => {
    const response = await runAdvisorGuard("client");

    expect(response.status).toBe(403);
    expect(mockLogger.info).toHaveBeenCalledWith(
      "API response returned",
      expect.objectContaining({
        statusCode: 403,
        duration: expect.any(Number),
      }),
    );
  });

  it("logs safe response summaries instead of raw response bodies", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });

    const handler = withApiHandler(
      {
        endpoint: "/api/test",
        method: "GET",
      },
      async () => ({
        data: {
          secret: "do-not-log",
          items: [1, 2, 3],
        },
      }),
    );

    const response = await handler(new Request("http://localhost/api/test"));

    expect(response.status).toBe(200);
    expect(mockLogger.info).toHaveBeenCalledWith(
      "API response returned",
      expect.not.objectContaining({
        responseBody: expect.anything(),
      }),
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      "API response returned",
      expect.objectContaining({
        responseKind: "json",
      }),
    );
  });
});
