import { beforeEach, describe, expect, it, vi } from "vitest";

const captureServerAnalyticsEventMock = vi.fn();
const getDbMock = vi.fn();
const isGeminiConfiguredMock = vi.fn();
const parseJsonBodyMock = vi.fn();
const streamTextMock = vi.fn();

vi.mock("@/lib/api/route-helpers", () => ({
  handleValidationError: vi.fn(),
  parseJsonBody: (...args: unknown[]) => parseJsonBodyMock(...args),
  withApiHandler: (
    _config: unknown,
    handler: (
      request: Request,
      context: {
        clientId: string;
        logger: {
          error: (...args: unknown[]) => Promise<void>;
          info: (...args: unknown[]) => Promise<void>;
          warn: (...args: unknown[]) => Promise<void>;
        };
        session: { user: { id: string } };
      },
    ) => Promise<Response | { data: unknown; status?: number }>,
  ) => {
    return async (request: Request) => {
      const result = await handler(request, {
        clientId: "client-123",
        logger: {
          error: vi.fn().mockResolvedValue(undefined),
          info: vi.fn().mockResolvedValue(undefined),
          warn: vi.fn().mockResolvedValue(undefined),
        },
        session: { user: { id: "user-123" } },
      });

      if (result instanceof Response) {
        return result;
      }

      return Response.json(result.data, { status: result.status ?? 200 });
    };
  },
}));

vi.mock("@/server/db", () => ({ getDb: getDbMock }));

vi.mock("@/server/db/schemas", () => ({
  asset: {
    currentValue: "currentValue",
    isLiquid: "isLiquid",
    clientId: "clientId",
    deletedAt: "deletedAt",
  },
  client: { id: "id", userId: "userId", deletedAt: "deletedAt" },
  clientChatMessage: {
    clientId: "clientId",
    userId: "userId",
    role: "role",
    sentAt: "sentAt",
    totalTokens: "totalTokens",
    id: "id",
  },
  debt: {
    currentBalance: "currentBalance",
    clientId: "clientId",
    deletedAt: "deletedAt",
  },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn(() => "and"),
  asc: vi.fn(() => "asc"),
  desc: vi.fn(() => "desc"),
  eq: vi.fn(() => "eq"),
  gte: vi.fn(() => "gte"),
  isNull: vi.fn(() => "isNull"),
  sql: Object.assign((strings: TemplateStringsArray) => strings.join(""), {
    raw: vi.fn(),
  }),
}));

vi.mock("@/server/ai", () => ({
  GEMINI_MODEL: "gemini-2.5-flash",
  GeminiApiError: class GeminiApiError extends Error {},
  buildClientChatPrompt: vi.fn(() => "PROMPT"),
  getSuggestedChatQuestions: vi.fn(() => []),
  isGeminiConfigured: (...args: unknown[]) => isGeminiConfiguredMock(...args),
  streamText: (...args: unknown[]) => streamTextMock(...args),
}));

vi.mock("@/server/observability/posthog", () => ({
  captureServerAnalyticsEvent: (...args: unknown[]) =>
    captureServerAnalyticsEventMock(...args),
}));

describe("POST /api/clients/[id]/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isGeminiConfiguredMock.mockReturnValue(true);
    parseJsonBodyMock.mockResolvedValue({
      body: { message: "Help me", surface: "client" },
    });

    let selectCall = 0;
    const selectResults = [
      [{ totalRequests: 0, oldestRequestInWindow: null }],
      [{ totalAssets: "100000", liquidAssets: "25000" }],
      [{ totalDebts: "10000" }],
    ];

    getDbMock.mockReturnValue({
      query: {
        client: {
          findFirst: vi.fn().mockResolvedValue({
            firstName: "Ava",
            lastName: "Nguyen",
            state: "CA",
            hasSpouse: false,
            clientIncome: "120000",
            spouseIncome: "0",
            existingLifeInsuranceCoverage: "100000",
            additionalGoals: null,
          }),
        },
        clientChatMessage: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
      insert: vi.fn(() => ({
        values: vi.fn().mockReturnValue({
          returning: vi
            .fn()
            .mockResolvedValueOnce([{ id: "user-msg-1" }])
            .mockResolvedValueOnce([
              {
                id: "assistant-msg-1",
                role: "assistant",
                content: "Hello there",
                model: "gemini-2.5-flash",
                promptTokens: 2,
                completionTokens: 3,
                totalTokens: 5,
                sentAt: new Date("2026-01-01T00:00:00.000Z"),
              },
            ]),
        }),
      })),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue(selectResults[selectCall++]),
        })),
      })),
    });

    streamTextMock.mockReturnValue(
      (async function* () {
        yield "Hello there";
      })(),
    );
  });

  it("captures a chat analytics event when a message is accepted", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/test", { method: "POST" }),
      {
        params: Promise.resolve({ id: "client-123" }),
      },
    );
    await response.text();

    expect(response.status).toBe(200);
    expect(captureServerAnalyticsEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: "user-123",
        event: "chat_message_sent",
        properties: expect.objectContaining({
          feature: "client-chat",
          outcome: "started",
          route: "/api/clients/[id]/chat",
        }),
      }),
    );
  });
});
