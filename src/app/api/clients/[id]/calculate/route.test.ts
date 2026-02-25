import { beforeEach, describe, expect, it, vi } from "vitest";

const calculateInsuranceNeedsRoundedWithTraceMock = vi.fn();
const computeEstimateConfidenceMock = vi.fn();
const resolveExistingCoverageMock = vi.fn();
const getDbMock = vi.fn();

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
        clientId: "test-client-id",
        session: { user: { id: "test-user-id" } },
      });

      if (result instanceof Response) {
        return result;
      }

      return Response.json(result.data, { status: result.status ?? 200 });
    };
  },
  parseJsonBody: vi.fn(),
  handleValidationError: vi.fn(),
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
  policy: {
    status: "status",
    faceAmount: "faceAmount",
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

vi.mock("@/lib/financial/insurance-needs", async () => {
  const actual = await vi.importActual("@/lib/financial/insurance-needs");
  return {
    ...actual,
    calculateInsuranceNeedsRoundedWithTrace:
      calculateInsuranceNeedsRoundedWithTraceMock,
  };
});

vi.mock("@/lib/financial/confidence-scoring", () => ({
  computeEstimateConfidence: computeEstimateConfidenceMock,
}));

vi.mock("@/lib/policy-utils", () => ({
  resolveExistingCoverage: resolveExistingCoverageMock,
}));

describe("POST /api/clients/[id]/calculate", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    let selectCall = 0;
    const selectResults = [
      [{ totalAssets: "500000", liquidAssets: "75000", assetCount: 2 }],
      [{ totalDebts: "200000", debtCount: 1 }],
      [{ totalActivePolicyCoverage: "300000", totalPolicyCount: 2 }],
    ];

    getDbMock.mockReturnValue({
      query: {
        client: {
          findFirst: vi.fn().mockResolvedValue({
            firstName: "Ava",
            lastName: "Nguyen",
            clientIncome: "120000",
            spouseIncome: null,
            hasSpouse: false,
            incomeReplacementPercent: "70",
            replacementDurationYears: 12,
            existingLifeInsuranceCoverage: "0",
          }),
        },
      },
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue(selectResults[selectCall++]),
        })),
      })),
    });

    resolveExistingCoverageMock.mockReturnValue({
      existingCoverage: 300000,
      coverageSource: "policies",
    });

    calculateInsuranceNeedsRoundedWithTraceMock.mockReturnValue({
      result: {
        incomeReplacementNeeds: 1008000,
        debtPayoffNeeds: 200000,
        estateBufferNeeds: 15000,
        grossNeeds: 1223000,
        existingCoverage: 300000,
        liquidAssets: 75000,
        totalInsuranceNeeds: 848000,
        totalInsuranceNeedsBand: {
          low: 763200,
          target: 848000,
          high: 932800,
        },
        inputsUsed: {
          clientIncome: 120000,
          spouseIncome: 0,
          includeSpouseIncome: false,
          incomeReplacementPercent: 70,
          replacementDurationYears: 12,
          estateBufferType: "fixed",
          estateBufferValue: 15000,
        },
      },
      trace: {
        version: "1.0.0",
        sections: [
          {
            key: "income_replacement",
            label: "Income replacement",
            result: 1008000,
            items: [
              {
                key: "client_income",
                label: "Client income",
                value: 120000,
                kind: "input",
                unit: "currency",
              },
            ],
          },
        ],
      },
    });

    computeEstimateConfidenceMock.mockReturnValue({
      score: 92,
      label: "High",
      reasons: [],
    });
  });

  it("includes structured trace in the response body", async () => {
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost/api/test"), {
      params: Promise.resolve({ id: "test-client-id" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.trace).toBeDefined();
    expect(body.trace.version).toBe("1.0.0");
    expect(body.trace.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "income_replacement",
          label: "Income replacement",
          items: expect.arrayContaining([
            expect.objectContaining({
              key: "client_income",
              kind: "input",
            }),
          ]),
        }),
      ]),
    );
    expect(body.totalInsuranceNeeds).toBe(848000);
  });
});
