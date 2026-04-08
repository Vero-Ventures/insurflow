import { beforeEach, describe, it, vi } from "vitest";

import {
  createBasicClientSchemasModule,
  createBasicDrizzleModule,
  createGetDbModule,
  createWithApiHandlerMock,
  expectTrackedGetResponse,
  policySchemaMock,
  TEST_CLIENT_ID,
  TEST_USER_ID,
} from "@/app/api/clients/__tests__/helpers/route-test-mocks";

const calculateInsuranceNeedsRoundedWithTraceMock = vi.fn();
const captureServerAnalyticsEventMock = vi.fn();
const computeEstimateConfidenceMock = vi.fn();
const getDbMock = vi.fn();
const pdfToBufferMock = vi.fn();
const resolveExistingCoverageMock = vi.fn();

vi.mock("@/lib/api/route-helpers", () => ({
  withApiHandler: createWithApiHandlerMock({
    clientId: TEST_CLIENT_ID,
    logger: {
      info: vi.fn().mockResolvedValue(undefined),
      warn: vi.fn().mockResolvedValue(undefined),
    },
    session: { user: { id: TEST_USER_ID } },
  }),
}));

vi.mock("@/server/db", () => createGetDbModule(getDbMock));

vi.mock("@/server/db/schemas", () => ({
  ...createBasicClientSchemasModule(),
  policy: policySchemaMock,
}));

vi.mock("drizzle-orm", () => createBasicDrizzleModule({ withAlias: true }));

vi.mock("@react-pdf/renderer", () => ({
  pdf: vi.fn(() => ({ toBuffer: pdfToBufferMock })),
}));

vi.mock("@/lib/financial/insurance-needs", async () => ({
  DEFAULT_ESTATE_BUFFER: { type: "fixed", amount: 15000 },
  calculateInsuranceNeedsRoundedWithTrace:
    calculateInsuranceNeedsRoundedWithTraceMock,
}));

vi.mock("@/lib/financial/confidence-scoring", () => ({
  computeEstimateConfidence: computeEstimateConfidenceMock,
}));

vi.mock("@/lib/policy-utils", () => ({
  resolveExistingCoverage: resolveExistingCoverageMock,
}));

vi.mock("@/lib/financial/settling-requirements-us", () => ({
  calculateUSSettlingRequirementsRounded: vi.fn(() => null),
  isValidUSState: vi.fn(() => true),
  US_STATE_NAMES: { CA: "California" },
}));

vi.mock("@/lib/compliance/packet-builder", () => ({
  buildCompliancePacket: vi.fn(() => ({
    metadata: { packetVersion: "1.0.0" },
  })),
}));

vi.mock("@/components/compliance/compliance-packet-document", () => ({
  CompliancePacketDocument: vi.fn(() => null),
}));

vi.mock("./route-helpers", () => ({
  extractPolicyCoverageAggregate: vi.fn(() => ({
    totalPolicyCount: 1,
    activePolicyCoverage: 100000,
  })),
  hasClientValue: vi.fn(() => true),
}));

vi.mock("@/server/pdf/utils", () => ({
  safeFilename: vi.fn(() => "ava-nguyen"),
}));

vi.mock("@/server/observability/posthog", () => ({
  captureServerAnalyticsEvent: (...args: unknown[]) =>
    captureServerAnalyticsEventMock(...args),
}));

describe("GET /api/clients/[id]/compliance-packet", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getDbMock.mockReturnValue({
      query: {
        client: {
          findFirst: vi.fn().mockResolvedValue({
            firstName: "Ava",
            lastName: "Nguyen",
            dateOfBirth: "1990-01-01",
            state: "CA",
            hasSpouse: false,
            smoker: false,
            healthRating: "standard",
            clientIncome: "120000",
            spouseIncome: "0",
            incomeReplacementPercent: "70",
            replacementDurationYears: 10,
            existingLifeInsuranceCoverage: "100000",
          }),
        },
      },
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi
            .fn()
            .mockResolvedValue([
              { totalAssets: "100000", liquidAssets: "20000", assetCount: 1 },
            ]),
        })),
      })),
    });

    resolveExistingCoverageMock.mockReturnValue({
      existingCoverage: 100000,
      coverageSource: "policies",
    });
    calculateInsuranceNeedsRoundedWithTraceMock.mockReturnValue({
      result: { totalInsuranceNeeds: 500000 },
      trace: { version: "1.0.0", sections: [] },
    });
    computeEstimateConfidenceMock.mockReturnValue({
      score: 90,
      label: "High",
      reasons: [],
    });
    pdfToBufferMock.mockResolvedValue(Buffer.from("pdf"));
  });

  it("captures a compliance packet analytics event", async () => {
    const { GET } = await import("./route");

    await expectTrackedGetResponse({
      analyticsMock: captureServerAnalyticsEventMock,
      feature: "compliance-packet",
      getHandler: GET,
      route: "/api/clients/[id]/compliance-packet",
    });
  });
});
