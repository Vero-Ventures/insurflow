import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import DemoEstimatePage from "@/app/demo/estimate/page";
import type { RecommendationInput } from "@/lib/financial/product-recommendation";
import type { CanadianProvince } from "@/lib/constants";

const pushMock = vi.fn();
const recommendationsCardInputSpy =
  vi.fn<(input: RecommendationInput) => void>();
const updateAnalysisAssumptionsMock = vi.fn();
const updateIntakeDataMock = vi.fn();

interface DemoEstimateMockState {
  intakeData: {
    annualHouseholdIncome: string;
    totalDebts: string;
    currentCoverage: string;
    province?: CanadianProvince | string;
  };
  analysisAssumptions: {
    incomeReplacementPercent: number;
    replacementDurationYears: number;
    liquidAssets: number;
  };
}

const baseDemoState: DemoEstimateMockState = {
  intakeData: {
    annualHouseholdIncome: "210000",
    totalDebts: "515500",
    currentCoverage: "250000",
  },
  analysisAssumptions: {
    incomeReplacementPercent: 70,
    replacementDurationYears: 15,
    liquidAssets: 70000,
  },
};

let mockState: DemoEstimateMockState = structuredClone(baseDemoState);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/components/financial/product-recommendations-card", () => ({
  ProductRecommendationsCard: ({ input }: { input: RecommendationInput }) => {
    recommendationsCardInputSpy(input);
    return <div data-testid="product-recommendations-card" />;
  },
}));

vi.mock("@/components/demo/demo-context", () => ({
  useDemoContext: () => ({
    state: mockState,
    updateAnalysisAssumptions: updateAnalysisAssumptionsMock,
    updateIntakeData: updateIntakeDataMock,
  }),
}));

describe("DemoEstimatePage", () => {
  beforeEach(() => {
    mockState = structuredClone(baseDemoState);
    pushMock.mockReset();
    recommendationsCardInputSpy.mockClear();
    updateAnalysisAssumptionsMock.mockClear();
    updateIntakeDataMock.mockReset();
    updateIntakeDataMock.mockImplementation(
      (updates: { province?: CanadianProvince }) => {
        if (updates.province !== undefined) {
          mockState = {
            ...mockState,
            intakeData: {
              ...mockState.intakeData,
              province: updates.province,
            },
          };
        }
      },
    );
  });

  it("falls back to income_replacement when primaryGoal is not a valid InsuranceGoal", () => {
    render(<DemoEstimatePage />);

    const latestInput = recommendationsCardInputSpy.mock.calls.at(-1)?.[0];
    expect(latestInput?.primaryGoal).toBe("income_replacement");
  });

  it("shows calculation transparency in demo estimate", () => {
    render(<DemoEstimatePage />);

    expect(screen.getByText(/how we calculated this/i)).toBeTruthy();
    expect(
      screen.getByText(
        /based on your profile, your life expectancy is approximately/i,
      ),
    ).toBeTruthy();
    expect(screen.getByText(/2017 cso mortality tables/i)).toBeTruthy();
  });

  it("renders a province/territory selector with all Canadian options", () => {
    render(<DemoEstimatePage />);

    const selector = screen.getByLabelText(/province or territory/i);
    expect(selector).toBeTruthy();

    [
      "AB",
      "BC",
      "MB",
      "NB",
      "NL",
      "NS",
      "NT",
      "NU",
      "ON",
      "PE",
      "QC",
      "SK",
      "YT",
    ].forEach((province) => {
      expect(
        screen.getByRole("option", {
          name: new RegExp(String.raw`^${province}\s-\s`),
        }),
      ).toBeTruthy();
    });
  });

  it("switches the displayed rate table when province changes", () => {
    const { rerender } = render(<DemoEstimatePage />);

    expect(screen.getByText(/ontario rate table/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/province or territory/i), {
      target: { value: "BC" },
    });

    expect(updateIntakeDataMock).toHaveBeenCalledWith({ province: "BC" });
    rerender(<DemoEstimatePage />);
    expect(screen.getByText(/british columbia rate table/i)).toBeTruthy();
  });

  it("persists province changes through demo intake context", () => {
    render(<DemoEstimatePage />);

    fireEvent.change(screen.getByLabelText(/province or territory/i), {
      target: { value: "QC" },
    });

    expect(updateIntakeDataMock).toHaveBeenCalledWith({ province: "QC" });
  });

  it("defaults to the client province when present and valid", () => {
    mockState = {
      ...structuredClone(baseDemoState),
      intakeData: {
        ...structuredClone(baseDemoState.intakeData),
        province: "QC",
      },
    };

    render(<DemoEstimatePage />);

    expect(screen.getByText(/quebec rate table/i)).toBeTruthy();
  });

  it("falls back to ON when client province is missing or invalid", () => {
    mockState = {
      ...structuredClone(baseDemoState),
      intakeData: {
        ...structuredClone(baseDemoState.intakeData),
        province: "CA",
      },
    };

    render(<DemoEstimatePage />);

    expect(screen.getByText(/ontario rate table/i)).toBeTruthy();
  });

  it("does not show California-specific rate table content by default", () => {
    render(<DemoEstimatePage />);

    expect(screen.queryByText(/california rate table/i)).toBeNull();
  });
});
