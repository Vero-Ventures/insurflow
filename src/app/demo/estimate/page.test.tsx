import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DemoEstimatePage from "@/app/demo/estimate/page";
import type { RecommendationInput } from "@/lib/financial/product-recommendation";

const pushMock = vi.fn();
const recommendationsCardInputSpy =
  vi.fn<(input: RecommendationInput) => void>();

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
    state: {
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
    },
    updateAnalysisAssumptions: vi.fn(),
  }),
}));

describe("DemoEstimatePage", () => {
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
});
