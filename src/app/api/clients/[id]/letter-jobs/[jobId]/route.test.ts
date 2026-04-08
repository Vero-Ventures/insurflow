import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAsyncLoggerMock,
  createWithApiHandlerMock,
  TEST_USER_ID,
  TEST_UUID_CLIENT_ID,
  TEST_UUID_JOB_ID,
} from "@/app/api/clients/__tests__/helpers/route-test-mocks";

const findLetterGenerationJobMock = vi.fn();

vi.mock("@/lib/api/route-helpers", () => ({
  withApiHandler: createWithApiHandlerMock({
    logger: createAsyncLoggerMock(),
    clientId: TEST_UUID_CLIENT_ID,
    session: { user: { id: TEST_USER_ID } },
    params: { jobId: TEST_UUID_JOB_ID },
    resourceIds: { jobId: TEST_UUID_JOB_ID },
  }),
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
        jobId: TEST_UUID_JOB_ID,
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      jobId: TEST_UUID_JOB_ID,
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
        jobId: TEST_UUID_JOB_ID,
      }),
    });

    expect(response.status).toBe(404);
  });
});
