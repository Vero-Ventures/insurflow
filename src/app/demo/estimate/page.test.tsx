import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DemoEstimatePage from "@/app/demo/estimate/page";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
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
  it("shows calculation transparency in demo estimate", () => {
    render(<DemoEstimatePage />);

    expect(screen.getByText(/how we calculated this/i)).toBeTruthy();
  });
});
