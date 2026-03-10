import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ApplyFactFindingPage from "@/app/apply/fact-finding/page";

const pushMock = vi.fn();

type MockIntake = {
  hasSpouse: boolean;
  spouseAge: number | null;
  youngestChildAge: number | null;
  additionalGoals: string;
};

let mockIntake: MockIntake = {
  hasSpouse: false,
  spouseAge: null,
  youngestChildAge: null,
  additionalGoals: "",
};

const updateFieldMock = vi.fn();
const hookState = {
  get intake() {
    return mockIntake;
  },
  updateField: updateFieldMock,
  isHydrated: true,
  clientId: null as string | null,
  isSaving: false,
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock("@/lib/d2c/use-draft-persistence", () => ({
  useDraftPersistence: () => hookState,
}));

describe("ApplyFactFindingPage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    updateFieldMock.mockReset();
    mockIntake = {
      hasSpouse: false,
      spouseAge: null,
      youngestChildAge: null,
      additionalGoals: "",
    };
    hookState.clientId = null;
  });

  it("renders fact finding step", () => {
    render(<ApplyFactFindingPage />);

    expect(screen.getByRole("heading", { name: /fact finding/i })).toBeTruthy();
    expect(screen.getByText(/step 2 of 4/i)).toBeTruthy();
  });

  it("continues to estimate when spouse details are valid", () => {
    mockIntake = { ...mockIntake, hasSpouse: true, spouseAge: 40 };
    render(<ApplyFactFindingPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /continue to estimate/i }),
    );

    expect(pushMock).toHaveBeenCalledWith("/apply/estimate");
  });

  it("forwards clientId when continuing to estimate", () => {
    hookState.clientId = "aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    render(<ApplyFactFindingPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /continue to estimate/i }),
    );

    expect(pushMock).toHaveBeenCalledWith(
      "/apply/estimate?clientId=aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
  });

  it("disables continue when spouse age is missing", () => {
    mockIntake = { ...mockIntake, hasSpouse: true, spouseAge: null };
    render(<ApplyFactFindingPage />);

    const continueButton = screen.getByRole("button", {
      name: /continue to estimate/i,
    });

    expect(continueButton.getAttribute("disabled")).not.toBeNull();
  });
});
