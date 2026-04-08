import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  assetSchemaMock,
  clientSchemaMock,
  createAsyncLoggerMock,
  createSqlMock,
  createWithApiHandlerMock,
  debtSchemaMock,
  TEST_USER_ID,
  TEST_UUID_CLIENT_ID,
  TEST_UUID_JOB_ID,
} from "@/app/api/clients/__tests__/helpers/route-test-mocks";

const enqueueLetterGenerationJobMock = vi.fn();
const calculateInsuranceNeedsRoundedMock = vi.fn();
const buildReasonsWhyPromptMock = vi.fn();
const generateTextMock = vi.fn();
const getDbMock = vi.fn();
const isGeminiConfiguredMock = vi.fn();
const captureServerAnalyticsEventMock = vi.fn();

vi.mock("@/lib/api/route-helpers", () => ({
  withApiHandler: createWithApiHandlerMock({
    logger: createAsyncLoggerMock(),
    clientId: TEST_UUID_CLIENT_ID,
    session: { user: { id: TEST_USER_ID } },
  }),
}));

vi.mock("@/server/db", () => ({
  getDb: getDbMock,
}));

vi.mock("@/server/db/schemas", () => ({
  asset: assetSchemaMock,
  client: clientSchemaMock,
  debt: debtSchemaMock,
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn(() => "and"),
  eq: vi.fn(() => "eq"),
  isNull: vi.fn(() => "isNull"),
  sql: createSqlMock(),
}));

vi.mock("@/lib/api/letter-generation-helpers", () => ({
  enqueueLetterGenerationJob: (...args: unknown[]) =>
    enqueueLetterGenerationJobMock(...args),
}));

vi.mock("@/lib/financial/insurance-needs", async () => {
  return {
    DEFAULT_ESTATE_BUFFER: 15000,
    calculateInsuranceNeedsRounded: calculateInsuranceNeedsRoundedMock,
  };
});

vi.mock("@/server/ai", () => ({
  buildReasonsWhyPrompt: buildReasonsWhyPromptMock,
  generateText: generateTextMock,
  isGeminiConfigured: isGeminiConfiguredMock,
  GEMINI_MODEL: "gemini-2.5-flash",
  GeminiApiError: class GeminiApiError extends Error {},
}));

vi.mock("@/server/observability/posthog", () => ({
  captureServerAnalyticsEvent: (...args: unknown[]) =>
    captureServerAnalyticsEventMock(...args),
}));

describe("POST /api/clients/[id]/generate-letter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LETTER_WORKER_ENABLED = "true";

    let selectCall = 0;
    const selectResults = [
      [{ totalAssets: "150000", liquidAssets: "30000" }],
      [{ totalDebts: "50000" }],
    ];

    getDbMock.mockReturnValue({
      query: {
        client: {
          findFirst: vi.fn().mockResolvedValue({
            firstName: "Ava",
            lastName: "Nguyen",
            state: "CA",
            hasSpouse: false,
            spouseAge: null,
            clientIncome: "120000",
            spouseIncome: null,
            incomeReplacementPercent: "70",
            replacementDurationYears: 10,
            existingLifeInsuranceCoverage: "100000",
            additionalGoals: "Protect family",
          }),
        },
      },
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue(selectResults[selectCall++]),
        })),
      })),
    });

    isGeminiConfiguredMock.mockReturnValue(true);
    calculateInsuranceNeedsRoundedMock.mockReturnValue({
      incomeReplacementNeeds: 840000,
      debtPayoffNeeds: 50000,
      estateBufferNeeds: 15000,
      grossNeeds: 905000,
      existingCoverage: 100000,
      liquidAssets: 30000,
      totalInsuranceNeeds: 775000,
      inputsUsed: {
        incomeReplacementPercent: 70,
        replacementDurationYears: 10,
      },
    });
    buildReasonsWhyPromptMock.mockReturnValue("PROMPT");
    generateTextMock.mockResolvedValue("Sync letter");
    enqueueLetterGenerationJobMock.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440099",
      status: "queued",
    });
  });

  it("returns 202 and enqueues a background letter job", async () => {
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/test"), {
      params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440001" }),
    });
    const body = await response.json();
    const [, enqueueInput] = enqueueLetterGenerationJobMock.mock.calls[0] ?? [];

    expect(response.status).toBe(202);
    expect(enqueueLetterGenerationJobMock).toHaveBeenCalledTimes(1);
    expect(enqueueInput).toMatchObject({
      clientId: "550e8400-e29b-41d4-a716-446655440001",
      userId: "user-123",
      prompt: "PROMPT",
      model: "gemini-2.5-flash",
      temperature: "0.7",
      maxOutputTokens: 2048,
    });
    expect(body).toEqual({
      jobId: TEST_UUID_JOB_ID,
      status: "queued",
      pollUrl: `/api/clients/${TEST_UUID_CLIENT_ID}/letter-jobs/${TEST_UUID_JOB_ID}`,
    });
    expect(captureServerAnalyticsEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: "user-123",
        event: "letter_generation_started",
        properties: expect.objectContaining({
          feature: "reasons-why-letter",
          outcome: "queued",
          route: "/api/clients/[id]/generate-letter",
        }),
      }),
    );
  });

  it("still queues when worker mode is enabled and Gemini is not configured in the app", async () => {
    isGeminiConfiguredMock.mockReturnValue(false);

    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/test"), {
      params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440001" }),
    });

    expect(response.status).toBe(202);
    expect(enqueueLetterGenerationJobMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to synchronous generation when worker mode is disabled", async () => {
    process.env.LETTER_WORKER_ENABLED = "false";

    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/test"), {
      params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440001" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: "PROMPT" }),
    );
    expect(enqueueLetterGenerationJobMock).not.toHaveBeenCalled();
    expect(body.letter).toBe("Sync letter");
  });

  it("returns 503 in sync mode when Gemini is not configured", async () => {
    process.env.LETTER_WORKER_ENABLED = "false";
    isGeminiConfiguredMock.mockReturnValue(false);

    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/test"), {
      params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440001" }),
    });

    expect(response.status).toBe(503);
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(enqueueLetterGenerationJobMock).not.toHaveBeenCalled();
  });
});
