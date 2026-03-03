import { beforeEach, describe, expect, it, vi } from "vitest";

const calculateInsuranceNeedsRoundedWithTraceMock = vi.fn();
const computeEstimateConfidenceMock = vi.fn();
const resolveExistingCoverageMock = vi.fn();
const buildCompliancePacketMock = vi.fn();
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
  sql: Object.assign(
    (_strings: TemplateStringsArray) => ({
      as: vi.fn(),
    }),
    {
      raw: vi.fn(),
    },
  ),
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

vi.mock("@/lib/transparency/methodology-data", () => ({
  INSURANCE_NEEDS_METHODOLOGY: {
    id: "insurance-needs",
    name: "Insurance Needs",
  },
  INCOME_REPLACEMENT_METHODOLOGY: {
    id: "income-replacement",
    name: "Income Replacement",
  },
}));

vi.mock("@/lib/compliance/packet-builder", () => ({
  buildCompliancePacket: buildCompliancePacketMock,
}));

vi.mock("@/components/compliance/compliance-packet-document", () => ({
  CompliancePacketDocument: () => null,
}));

vi.mock("@react-pdf/renderer", () => ({
  pdf: vi.fn(() => ({
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("pdf")),
  })),
}));

vi.mock("@/lib/client-utils", () => ({
  calculateAge: vi.fn(() => 40),
}));

vi.mock("@/lib/financial/settling-requirements-us", () => ({
  calculateUSSettlingRequirementsRounded: vi.fn(() => ({
    totals: { totalCost: 1234 },
  })),
  isValidUSState: vi.fn(() => false),
  US_STATE_NAMES: {},
}));

describe("GET /api/clients/[id]/compliance-packet", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const selectMock = vi.fn((selection?: Record<string, unknown>) => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(
          (() => {
            if (!selection) {
              return [];
            }

            if ("assetCount" in selection) {
              return [{ totalAssets: "0", liquidAssets: "0", assetCount: 2 }];
            }

            if ("debtCount" in selection) {
              return [{ totalDebts: "0", debtCount: 1 }];
            }

            if ("totalPolicyCount" in selection) {
              return [{ totalActivePolicyCoverage: "0", totalPolicyCount: 1 }];
            }

            if ("totalAssets" in selection) {
              return [{ totalAssets: "0", liquidAssets: "0" }];
            }

            if ("totalDebts" in selection) {
              return [{ totalDebts: "0" }];
            }

            return [];
          })(),
        ),
      })),
    }));

    getDbMock.mockReturnValue({
      query: {
        client: {
          findFirst: vi.fn().mockResolvedValue({
            firstName: "Ava",
            lastName: "Nguyen",
            dateOfBirth: "1985-01-01",
            state: "CA",
            hasSpouse: false,
            smoker: false,
            healthRating: null,
            clientIncome: "0",
            spouseIncome: "0",
            incomeReplacementPercent: "0",
            replacementDurationYears: 10,
            existingLifeInsuranceCoverage: "0",
          }),
        },
      },
      select: selectMock,
    });

    resolveExistingCoverageMock.mockReturnValue({
      existingCoverage: 0,
      coverageSource: "policies",
    });

    calculateInsuranceNeedsRoundedWithTraceMock.mockReturnValue({
      result: {
        incomeReplacementNeeds: 0,
        debtPayoffNeeds: 0,
        estateBufferNeeds: 15000,
        grossNeeds: 15000,
        existingCoverage: 0,
        liquidAssets: 0,
        totalInsuranceNeeds: 15000,
        totalInsuranceNeedsBand: { low: 13500, target: 15000, high: 16500 },
        inputsUsed: {
          clientIncome: 0,
          spouseIncome: 0,
          includeSpouseIncome: false,
          incomeReplacementPercent: 0,
          replacementDurationYears: 10,
          estateBufferType: "fixed",
          estateBufferValue: 15000,
        },
      },
      trace: { version: "1.0.0", sections: [] },
    });

    computeEstimateConfidenceMock.mockReturnValue({
      score: 88,
      label: "High",
      reasons: [],
    });

    buildCompliancePacketMock.mockReturnValue({
      metadata: { packetVersion: "1.0.0" },
    });
  });

  it("uses policy record presence even when only inactive policies exist", async () => {
    const { GET } = await import("./route");

    await GET(new Request("http://localhost/api/test"), {
      params: Promise.resolve({ id: "test-client-id" }),
    });

    expect(resolveExistingCoverageMock).toHaveBeenCalledWith({
      totalPolicyCount: 1,
      activePolicyCoverage: 0,
      legacyCoverage: 0,
    });
  });

  it("treats provided zero values as complete input data", async () => {
    const { GET } = await import("./route");

    await GET(new Request("http://localhost/api/test"), {
      params: Promise.resolve({ id: "test-client-id" }),
    });

    expect(computeEstimateConfidenceMock).toHaveBeenCalledWith({
      completeness: expect.objectContaining({
        clientIncome: true,
        spouseIncome: true,
        incomeReplacementPercent: true,
        assetsData: true,
        debtsData: true,
      }),
      assumptionsUsed: expect.any(Object),
    });
  });
});
