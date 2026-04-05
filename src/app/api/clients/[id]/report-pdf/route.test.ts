import { beforeEach, describe, expect, it, vi } from "vitest";

const calculateInsuranceNeedsRoundedMock = vi.fn();
const captureServerAnalyticsEventMock = vi.fn();
const getDbMock = vi.fn();
const pdfToBufferMock = vi.fn();

vi.mock("@/lib/api/route-helpers", () => ({
  withApiHandler: (
    _config: unknown,
    handler: (
      request: Request,
      context: {
        clientId: string;
        session: { user: { id: string } };
      },
    ) => Promise<Response | { data: unknown; status?: number }>,
  ) => {
    return async (request: Request) => {
      const result = await handler(request, {
        clientId: "client-123",
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

vi.mock("@react-pdf/renderer", () => ({
  pdf: vi.fn(() => ({ toBuffer: pdfToBufferMock })),
}));

vi.mock("@/lib/financial/insurance-needs", async () => ({
  DEFAULT_ESTATE_BUFFER: 15000,
  calculateInsuranceNeedsRounded: calculateInsuranceNeedsRoundedMock,
}));

vi.mock("@/server/pdf/client-report-pdf", () => ({
  createClientReportPdfDocument: vi.fn(() => ({ type: "pdf-doc" })),
}));

vi.mock("@/server/pdf/utils", () => ({
  safeFilename: vi.fn(() => "ava-nguyen"),
}));

vi.mock("@/server/observability/posthog", () => ({
  captureServerAnalyticsEvent: (...args: unknown[]) =>
    captureServerAnalyticsEventMock(...args),
}));

describe("GET /api/clients/[id]/report-pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    let selectCall = 0;
    const selectResults = [
      [{ totalAssets: "100000", liquidAssets: "25000" }],
      [{ totalDebts: "20000" }],
    ];

    getDbMock.mockReturnValue({
      query: {
        client: {
          findFirst: vi.fn().mockResolvedValue({
            firstName: "Ava",
            lastName: "Nguyen",
            dateOfBirth: "1990-01-01",
            state: "CA",
            smoker: false,
            healthRating: "standard",
            clientIncome: "120000",
            spouseIncome: "0",
            hasSpouse: false,
            incomeReplacementPercent: "70",
            replacementDurationYears: 10,
            existingLifeInsuranceCoverage: "100000",
          }),
        },
      },
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue(selectResults[selectCall++]),
        })),
      })),
    });

    calculateInsuranceNeedsRoundedMock.mockReturnValue({
      totalInsuranceNeeds: 500000,
    });
    pdfToBufferMock.mockResolvedValue(Buffer.from("pdf"));
  });

  it("captures a report generation analytics event", async () => {
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/test"), {
      params: Promise.resolve({ id: "client-123" }),
    });

    expect(response.status).toBe(200);
    expect(captureServerAnalyticsEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: "user-123",
        event: "report_pdf_generated",
        properties: expect.objectContaining({
          feature: "client-report-pdf",
          outcome: "completed",
          route: "/api/clients/[id]/report-pdf",
        }),
      }),
    );
  });
});
