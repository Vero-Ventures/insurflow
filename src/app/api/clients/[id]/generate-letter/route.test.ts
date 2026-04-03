import { beforeEach, describe, expect, it, vi } from "vitest";

const enqueueLetterGenerationJobMock = vi.fn();
const calculateInsuranceNeedsRoundedMock = vi.fn();
const buildReasonsWhyPromptMock = vi.fn();
const generateTextMock = vi.fn();
const getDbMock = vi.fn();
const isGeminiConfiguredMock = vi.fn();

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
      });

      if (result instanceof Response) {
        return result;
      }

      return Response.json(result.data, { status: result.status ?? 200 });
    };
  },
}));

vi.mock("@/server/db", () => ({
  getDb: getDbMock,
}));

vi.mock("@/server/db/schemas", () => ({
  asset: {
    currentValue: "currentValue",
    isLiquid: "isLiquid",
    clientId: "clientId",
    deletedAt: "deletedAt",
  },
  client: { id: "id", userId: "userId", deletedAt: "deletedAt" },
  debt: {
    currentBalance: "currentBalance",
    clientId: "clientId",
    deletedAt: "deletedAt",
  },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn(() => "and"),
  eq: vi.fn(() => "eq"),
  isNull: vi.fn(() => "isNull"),
  sql: Object.assign((strings: TemplateStringsArray) => strings.join(""), {
    raw: vi.fn(),
  }),
}));

vi.mock("@/lib/api/letter-generation-helpers", () => ({
  enqueueLetterGenerationJob: (...args: unknown[]) =>
    enqueueLetterGenerationJobMock(...args),
}));

vi.mock("@/lib/financial/insurance-needs", async () => {
  const actual = await vi.importActual("@/lib/financial/insurance-needs");
  return {
    ...actual,
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

describe("POST /api/clients/[id]/generate-letter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("LETTER_WORKER_ENABLED", "true");

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

    expect(response.status).toBe(202);
    expect(enqueueLetterGenerationJobMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        clientId: "550e8400-e29b-41d4-a716-446655440001",
        userId: "user-123",
        prompt: "PROMPT",
        model: "gemini-2.5-flash",
      }),
    );
    expect(body).toEqual({
      jobId: "550e8400-e29b-41d4-a716-446655440099",
      status: "queued",
      pollUrl:
        "/api/clients/550e8400-e29b-41d4-a716-446655440001/letter-jobs/550e8400-e29b-41d4-a716-446655440099",
    });
  });

  it("returns 503 when Gemini is not configured", async () => {
    isGeminiConfiguredMock.mockReturnValue(false);

    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/test"), {
      params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440001" }),
    });

    expect(response.status).toBe(503);
    expect(enqueueLetterGenerationJobMock).not.toHaveBeenCalled();
  });

  it("falls back to synchronous generation when worker mode is disabled", async () => {
    vi.stubEnv("LETTER_WORKER_ENABLED", "false");

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
});
