import { beforeEach, describe, expect, it, vi } from "vitest";

const findLetterGenerationJobMock = vi.fn();

vi.mock("@/lib/api/route-helpers", () => ({
  withApiHandler: (
    _config: unknown,
    handler: (
      request: Request,
      context: {
        logger: {
          addContext: (ctx: Record<string, unknown>) => void;
          info: (...args: unknown[]) => Promise<void>;
          warn: (...args: unknown[]) => Promise<void>;
          error: (...args: unknown[]) => Promise<void>;
        };
        clientId: string;
        session: { user: { id: string } };
        params: { jobId: string };
        resourceIds: { jobId: string };
      },
    ) => Promise<Response | { data: unknown; status?: number }>,
  ) => {
    return async (request: Request) => {
      const logger = {
        addContext: vi.fn(),
        info: vi.fn().mockResolvedValue(undefined),
        warn: vi.fn().mockResolvedValue(undefined),
        error: vi.fn().mockResolvedValue(undefined),
      };

      const result = await handler(request, {
        logger,
        clientId: "550e8400-e29b-41d4-a716-446655440001",
        session: { user: { id: "user-123" } },
        params: { jobId: "550e8400-e29b-41d4-a716-446655440099" },
        resourceIds: { jobId: "550e8400-e29b-41d4-a716-446655440099" },
      });

      if (result instanceof Response) {
        return result;
      }

      return Response.json(result.data, { status: result.status ?? 200 });
    };
  },
}));

vi.mock("@/server/db", () => ({
  getDb: vi.fn(() => ({})),
}));

vi.mock("@/lib/api/letter-generation-helpers", () => ({
  findLetterGenerationJob: (...args: unknown[]) =>
    findLetterGenerationJobMock(...args),
}));

describe("GET /api/clients/[id]/letter-jobs/[jobId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the current job status and result payload", async () => {
    findLetterGenerationJobMock.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440099",
      status: "completed",
      resultLetter: "Letter body",
      resultGeneratedAt: new Date("2026-04-02T18:05:00Z"),
      errorCode: null,
      errorMessage: null,
    });

    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/test"), {
      params: Promise.resolve({
        id: "550e8400-e29b-41d4-a716-446655440001",
        jobId: "550e8400-e29b-41d4-a716-446655440099",
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      jobId: "550e8400-e29b-41d4-a716-446655440099",
      status: "completed",
      letter: "Letter body",
      generatedAt: "2026-04-02T18:05:00.000Z",
      errorCode: null,
      errorMessage: null,
    });
  });

  it("returns 404 when the requested job does not exist", async () => {
    findLetterGenerationJobMock.mockResolvedValue(null);

    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/test"), {
      params: Promise.resolve({
        id: "550e8400-e29b-41d4-a716-446655440001",
        jobId: "550e8400-e29b-41d4-a716-446655440099",
      }),
    });

    expect(response.status).toBe(404);
  });
});
