import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LetterGenerationJob } from "@/server/db/schemas";

const TEST_JOB_ID = "550e8400-e29b-41d4-a716-446655440111";
const TEST_CLIENT_ID = "550e8400-e29b-41d4-a716-446655440112";
const TEST_USER_ID = "user-123";

function createJob(
  overrides: Partial<LetterGenerationJob> = {},
): LetterGenerationJob {
  return {
    id: TEST_JOB_ID,
    clientId: TEST_CLIENT_ID,
    userId: TEST_USER_ID,
    status: "queued",
    attempts: 0,
    maxAttempts: 3,
    prompt: "prompt",
    model: "gemini-2.5-flash",
    resultLetter: null,
    resultGeneratedAt: null,
    errorCode: null,
    errorMessage: null,
    requestedAt: new Date("2026-04-02T18:00:00Z"),
    startedAt: null,
    completedAt: null,
    failedAt: null,
    createdAt: new Date("2026-04-02T18:00:00Z"),
    updatedAt: new Date("2026-04-02T18:00:00Z"),
    deletedAt: null,
    ...overrides,
  };
}

describe("letter generation helpers", () => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn();
  const mockInsert = vi.fn();
  const mockFindFirst = vi.fn();

  const db = {
    insert: mockInsert,
    query: {
      letterGenerationJob: {
        findFirst: mockFindFirst,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({
      values: mockValues,
    });
    mockValues.mockReturnValue({ returning: mockReturning });
  });

  it("enqueues a queued letter-generation job", async () => {
    const queuedJob = createJob();
    mockReturning.mockResolvedValue([queuedJob]);

    const { enqueueLetterGenerationJob } =
      await import("../letter-generation-helpers");

    const result = await enqueueLetterGenerationJob(db as never, {
      clientId: TEST_CLIENT_ID,
      userId: TEST_USER_ID,
      prompt: "hello world",
      model: "gemini-2.5-flash",
    });

    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: TEST_CLIENT_ID,
        userId: TEST_USER_ID,
        status: "queued",
        prompt: "hello world",
        model: "gemini-2.5-flash",
      }),
    );
    expect(result).toEqual(queuedJob);
  });

  it("looks up a job by id, client, and owner", async () => {
    const completedJob = createJob({
      status: "completed",
      resultLetter: "Done",
      completedAt: new Date("2026-04-02T18:05:00Z"),
      resultGeneratedAt: new Date("2026-04-02T18:05:00Z"),
    });
    mockFindFirst.mockResolvedValue(completedJob);

    const { findLetterGenerationJob } =
      await import("../letter-generation-helpers");

    const result = await findLetterGenerationJob(db as never, {
      jobId: TEST_JOB_ID,
      clientId: TEST_CLIENT_ID,
      userId: TEST_USER_ID,
    });

    expect(mockFindFirst).toHaveBeenCalledTimes(1);
    expect(result).toEqual(completedJob);
  });
});
