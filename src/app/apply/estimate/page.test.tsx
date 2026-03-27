import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ApplyEstimatePage from "@/app/apply/estimate/page";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const getMock = vi.fn().mockReturnValue(null);
const useSessionMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => ({ get: getMock }),
}));

vi.mock("@/server/better-auth/client", () => ({
  authClient: {
    useSession: () => useSessionMock(),
  },
}));

describe("ApplyEstimatePage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    replaceMock.mockReset();
    getMock.mockReset();
    getMock.mockReturnValue(null);
    useSessionMock.mockReset();
    useSessionMock.mockReturnValue({ data: null });
    vi.restoreAllMocks();
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
        screen.getByRole("heading", { name: /estimate preview/i }),
      ).toBeTruthy();
    });

    expect(
      screen.getByText(/not an offer, quote, or policy approval/i),
    ).toBeTruthy();
    expect(screen.getByText(/selected provider review/i)).toBeTruthy();
    expect(screen.queryByText(/carrier review/i)).toBeNull();
    expect(screen.getByText(/step 3 of 4/i)).toBeTruthy();
    expect(
      screen.getByText(
        /based on your profile, your life expectancy is approximately/i,
      ),
    ).toBeTruthy();
    expect(screen.getByText(/2017 cso mortality tables/i)).toBeTruthy();
  });

  it("navigates to review step", async () => {
    render(<ApplyEstimatePage />);

    const continueButton = await screen.findByRole("button", {
      name: /continue to review/i,
    });

    fireEvent.click(continueButton);
    expect(pushMock).toHaveBeenCalledWith("/apply/review");
  });

  it("creates a draft and forwards clientId for authenticated users", async () => {
    useSessionMock.mockReturnValue({ data: { user: { id: "user-1" } } });

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        draft: { id: "aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
      }),
    } as Response);

    render(<ApplyEstimatePage />);

    const continueButton = await screen.findByRole("button", {
      name: /continue to review/i,
    });

    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        "/apply/review?clientId=aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      );
    });
  });

  it("forwards clientId search param to review URL when present", async () => {
    const testClientId = "aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    getMock.mockReturnValue(testClientId);

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        draft: {
          id: testClientId,
          firstName: "",
          lastName: "",
          dateOfBirth: "1990-05-15",
          sex: "M",
          province: "ON",
          smoker: false,
          healthRating: "standard",
          clientIncome: "90000",
          existingLifeInsuranceCoverage: "500000",
          replacementDurationYears: 20,
          status: "draft",
        },
      }),
    } as Response);

    render(<ApplyEstimatePage />);

    const continueButton = await screen.findByRole("button", {
      name: /continue to review/i,
    });

    fireEvent.click(continueButton);
    expect(pushMock).toHaveBeenCalledWith(
      `/apply/review?clientId=${testClientId}`,
    );
  });

  it("redirects to intake without stale clientId when draft load fails", async () => {
    const staleClientId = "aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    getMock.mockReturnValue(staleClientId);

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
    } as Response);

    render(<ApplyEstimatePage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/apply/intake");
    });
  });
});
