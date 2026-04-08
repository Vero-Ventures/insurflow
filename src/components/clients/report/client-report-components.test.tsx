import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Client } from "@/types/client";
import type { Asset } from "@/types/asset";
import type { Debt } from "@/types/debt";
import {
  ClientReportAnalysisSection,
  ClientReportFooter,
  ClientReportInsuranceSection,
  ClientReportNetWorthSection,
  ClientReportHeader,
  ClientReportFinancialInputsSection,
  ClientReportPdfTrigger,
  ClientReportProfileSection,
  ClientReportSection,
} from "./index";
import type { InsuranceNeedsResult } from "@/lib/hooks/use-insurance-needs";

vi.mock("@/components/clients/assets-summary", () => ({
  AssetsSummary: () => <div>Assets summary</div>,
}));

vi.mock("@/components/clients/debts-summary", () => ({
  DebtsSummary: () => <div>Debts summary</div>,
}));

vi.mock("@/components/clients/insurance-needs", () => ({
  InsuranceNeedsCard: () => <div>Insurance needs card</div>,
  InsuranceNeedsChart: () => <div>Insurance needs chart</div>,
}));

vi.mock("@/components/clients/charts/net-worth-projection-chart", () => ({
  NetWorthProjectionChart: () => <div>Net worth projection</div>,
}));

vi.mock("@/components/clients/charts/tax-burden-chart", () => ({
  TaxBurdenChart: () => <div>Tax burden chart</div>,
}));

vi.mock("@/components/clients/charts/liquidity-analysis-chart", () => ({
  LiquidityAnalysisChart: () => <div>Liquidity analysis</div>,
}));

vi.mock("@/components/clients/charts/asset-diversification-chart", () => ({
  AssetDiversificationChart: () => <div>Asset diversification</div>,
}));

vi.mock("@/components/clients/charts/beneficiary-distribution-chart", () => ({
  BeneficiaryDistributionChart: () => <div>Beneficiary distribution</div>,
}));

vi.mock("@/components/clients/charts/debt-amortization-chart", () => ({
  DebtAmortizationChart: () => <div>Debt amortization</div>,
}));

vi.mock("@/components/clients/charts/goals-progress-chart", () => ({
  GoalsProgressChart: () => <div>Goals progress</div>,
}));

const baseClient: Client = {
  id: "client-1",
  firstName: "Ada",
  lastName: "Lovelace",
  dateOfBirth: "1985-12-10",
  state: "ON",
  status: "active",
  sex: "F",
  smoker: false,
  healthRating: "preferred",
  hasSpouse: false,
  updatedAt: "2026-01-02T00:00:00.000Z",
};

const baseAssets: Asset[] = [
  {
    id: "asset-1",
    clientId: "client-1",
    name: "Cash",
    type: "savings",
    currentValue: "25000",
    isLiquid: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    deletedAt: null,
  },
];

const baseDebts: Debt[] = [
  {
    id: "debt-1",
    clientId: "client-1",
    name: "Home loan",
    type: "mortgage",
    currentBalance: "100000",
    deletedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
];

const insuranceResult: InsuranceNeedsResult = {
  incomeReplacementNeeds: 100000,
  debtPayoffNeeds: 100000,
  estateBufferNeeds: 15000,
  grossNeeds: 215000,
  existingCoverage: 25000,
  liquidAssets: 25000,
  totalInsuranceNeeds: 165000,
  inputsUsed: {
    clientIncome: 90000,
    spouseIncome: 0,
    includeSpouseIncome: false,
    incomeReplacementPercent: 70,
    replacementDurationYears: 10,
    estateBufferType: "fixed",
    estateBufferValue: 15000,
  },
};

describe("client report extracted components", () => {
  it("renders the report header with demo badge and actions", () => {
    render(
      <ClientReportHeader
        client={baseClient}
        isDemo
        generatedAt="2026-04-02T12:00:00.000Z"
        showPdfTrigger
        pdfTrigger={
          <ClientReportPdfTrigger
            isDownloading={false}
            onDownload={vi.fn()}
            label="Download PDF"
            loadingLabel="Preparing PDF..."
          />
        }
        complianceTrigger={<button type="button">Compliance Packet</button>}
      />,
    );

    expect(screen.getByRole("heading", { name: /ada lovelace/i })).toBeTruthy();
    expect(screen.getByText("Demo")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Compliance Packet" }),
    ).toBeTruthy();
  });

  it("renders a pdf trigger loading state", () => {
    render(
      <ClientReportPdfTrigger
        isDownloading
        onDownload={vi.fn()}
        label="Download PDF"
        loadingLabel="Preparing PDF..."
      />,
    );

    expect(
      screen.getByRole("button", { name: "Preparing PDF..." }),
    ).toHaveProperty("disabled", true);
  });

  it("renders a reusable report section shell", () => {
    render(
      <ClientReportSection title="Client Profile" description="Snapshot info">
        <div>Section body</div>
      </ClientReportSection>,
    );

    expect(screen.getByText("Client Profile")).toBeTruthy();
    expect(screen.getByText("Snapshot info")).toBeTruthy();
    expect(screen.getByText("Section body")).toBeTruthy();
  });

  it("renders the extracted report sections together", () => {
    render(
      <>
        <ClientReportProfileSection client={baseClient} />
        <ClientReportFinancialInputsSection client={baseClient} />
        <ClientReportNetWorthSection
          assets={baseAssets}
          debts={baseDebts}
          totalAssets={25000}
          isLoadingData={false}
        />
        <ClientReportInsuranceSection
          insuranceResult={insuranceResult}
          insuranceConfidence={null}
          isDemo={false}
          isInsuranceLoading={false}
          insuranceError={null}
          recalculateInsurance={vi.fn(async () => {})}
          insuranceCalculatedAt="2026-04-02T12:00:00.000Z"
          clientStateCode="ON"
        />
        <ClientReportAnalysisSection
          assets={baseAssets}
          debts={baseDebts}
          client={baseClient}
          totalAssets={25000}
          totalDebts={100000}
          settlingCosts={15000}
        />
        <ClientReportFooter
          clientId="client-1"
          updatedAt="2026-04-04T12:00:00.000Z"
        />
      </>,
    );

    expect(screen.getByText("Client Profile")).toBeTruthy();
    expect(screen.getByText("Financial Inputs")).toBeTruthy();
    expect(screen.getByText("Assets summary")).toBeTruthy();
    expect(screen.getByText("Insurance needs card")).toBeTruthy();
    expect(screen.getByText("Net worth projection")).toBeTruthy();
    expect(screen.getByText(/licensed insurance professional/i)).toBeTruthy();
  });
});
