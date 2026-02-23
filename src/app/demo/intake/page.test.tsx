import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DemoIntakePage from "@/app/demo/intake/page";

const pushMock = vi.fn();
const updateIntakeDataMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/components/demo/demo-context", () => ({
  useDemoContext: () => ({
    state: {
      selectedScenarioId: "young-family",
      intakeData: {
        householdStatus: "married",
        annualHouseholdIncome: "210000",
        totalDebts: "515500",
        currentCoverage: "250000",
        primaryGoal: "Protect my family.",
      },
    },
    updateIntakeData: updateIntakeDataMock,
  }),
}));

describe("DemoIntakePage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    updateIntakeDataMock.mockReset();
  });

  it("hides optional detail fields until user reveals them", () => {
    render(<DemoIntakePage />);

    expect(
      screen.queryByLabelText(/current life insurance coverage/i),
    ).toBeNull();
    expect(screen.queryByLabelText(/total debts/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /add more details/i }));

    expect(
      screen.getByLabelText(/current life insurance coverage/i),
    ).toBeTruthy();
    expect(screen.getByLabelText(/total debts/i)).toBeTruthy();
  });

  it("resets optional inputs when users continue without revealing them", () => {
    render(<DemoIntakePage />);

    fireEvent.click(screen.getByRole("button", { name: /see estimate now/i }));

    expect(updateIntakeDataMock).toHaveBeenCalledWith({
      totalDebts: "0",
      currentCoverage: "0",
      primaryGoal: "",
    });
    expect(pushMock).toHaveBeenCalledWith("/demo/estimate");
  });

  it("shows plain-language helper text for each visible field", () => {
    render(<DemoIntakePage />);

    expect(
      screen.getByText(/choose the option that best describes you/i),
    ).toBeTruthy();
    expect(screen.getByText(/an estimate is fine/i)).toBeTruthy();
  });
});
