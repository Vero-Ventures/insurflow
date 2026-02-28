import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ApplyEstimatePage from "@/app/apply/estimate/page";

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

describe("ApplyEstimatePage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    replaceMock.mockReset();
    sessionStorage.clear();
    sessionStorage.setItem(
      "d2c_intake",
      JSON.stringify({
        province: "ON",
        dateOfBirth: "1990-05-15",
        tobaccoUse: false,
        annualIncome: 90000,
        coverageAmount: 500000,
        termYears: 20,
        gender: "",
        healthClass: "",
      }),
    );
  });

  it("shows non-binding estimate language", async () => {
    render(<ApplyEstimatePage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /non-binding estimate preview/i }),
      ).toBeTruthy();
    });

    expect(
      screen.getByText(/not an offer, quote, or policy approval/i),
    ).toBeTruthy();
  });

  it("navigates to review step", async () => {
    render(<ApplyEstimatePage />);

    const continueButton = await screen.findByRole("button", {
      name: /continue to review/i,
    });

    fireEvent.click(continueButton);
    expect(pushMock).toHaveBeenCalledWith("/apply/review");
  });
});
