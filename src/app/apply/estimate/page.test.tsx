import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ApplyEstimatePage from "@/app/apply/estimate/page";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const getMock = vi.fn().mockReturnValue(null);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => ({ get: getMock }),
}));

/** Realistic mock outputs matching EstimateRunOutputs shape */
const MOCK_ESTIMATE_OUTPUTS = {
  insuranceNeeds: {
    incomeReplacementNeeds: 945_000,
    debtPayoffNeeds: 0,
    estateBufferNeeds: 25_000,
    grossNeeds: 970_000,
    existingCoverage: 0,
    liquidAssets: 0,
    totalInsuranceNeeds: 970_000,
  },
  recommendedCoverage: 970_000,
  premiumRange: {
    lowMonthlyPremiumCad: 42.35,
    highMonthlyPremiumCad: 67.89,
    currency: "CAD" as const,
    nonBinding: true as const,
  },
};

const MOCK_ESTIMATE_RUN_ID = "cccc1111-dddd-4ddd-8ddd-eeeeeeeeeeee";

/**
 * Builds a successful POST /api/d2c/estimate response.
 *
 * @returns A Response-shaped object with estimate run data.
 */
function buildEstimateResponse(): Partial<Response> {
  return {
    ok: true,
    json: async () => ({
      estimateRun: {
        id: MOCK_ESTIMATE_RUN_ID,
        runNumber: 1,
        outputs: MOCK_ESTIMATE_OUTPUTS,
        assumptionVersionLabel: "CA Term Life v1",
        engineVersion: "1.0.0",
        createdAt: "2026-03-15T12:00:00Z",
      },
    }),
  };
}

/**
 * Builds a failed POST /api/d2c/estimate response.
 *
 * @param message - Error message to include in the body.
 * @returns A Response-shaped object with error data.
 */
function buildEstimateErrorResponse(
  message = "Internal server error",
): Partial<Response> {
  return {
    ok: false,
    json: async () => ({ error: message }),
  };
}

describe("ApplyEstimatePage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    replaceMock.mockReset();
    getMock.mockReset();
    getMock.mockReturnValue(null);
    vi.restoreAllMocks();
    sessionStorage.clear();
    sessionStorage.setItem(
      "d2c_intake",
      JSON.stringify({
        province: "ON",
        dateOfBirth: "1990-05-15",
        tobaccoUse: false,
        annualIncome: 90_000,
        coverageAmount: 500_000,
        termYears: 20,
        gender: "",
        healthClass: "",
      }),
    );
  });

  it("shows non-binding estimate language after server estimate completes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      buildEstimateResponse() as Response,
    );

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
  });

  it("displays server-calculated coverage and premium range", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      buildEstimateResponse() as Response,
    );

    render(<ApplyEstimatePage />);

    await waitFor(() => {
      expect(screen.getByText(/\$970,000/)).toBeTruthy();
    });

    // Premium range from mock
    expect(screen.getByText(/\$42/)).toBeTruthy();
    expect(screen.getByText(/\$67/)).toBeTruthy();
  });

  it("navigates to review with estimateRunId", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      buildEstimateResponse() as Response,
    );

    render(<ApplyEstimatePage />);

    const continueButton = await screen.findByRole("button", {
      name: /continue to review/i,
    });

    await waitFor(() => {
      expect((continueButton as HTMLButtonElement).disabled).toBe(false);
    });

    fireEvent.click(continueButton);
    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining(`estimateRunId=${MOCK_ESTIMATE_RUN_ID}`),
    );
  });

  it("forwards clientId and estimateRunId to review URL when clientId present", async () => {
    const testClientId = "aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    getMock.mockReturnValue(testClientId);

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;

      // Mock draft endpoint
      if (url.includes("/api/d2c/draft/")) {
        return {
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
        } as Response;
      }

      // Mock estimate endpoint
      return buildEstimateResponse() as Response;
    });

    render(<ApplyEstimatePage />);

    const continueButton = await screen.findByRole("button", {
      name: /continue to review/i,
    });

    await waitFor(() => {
      expect((continueButton as HTMLButtonElement).disabled).toBe(false);
    });

    fireEvent.click(continueButton);
    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining(`clientId=${testClientId}`),
    );
    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining(`estimateRunId=${MOCK_ESTIMATE_RUN_ID}`),
    );
  });

  it("shows error state when estimate API fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      buildEstimateErrorResponse("Rate lookup unavailable") as Response,
    );

    render(<ApplyEstimatePage />);

    await waitFor(() => {
      expect(screen.getByText(/rate lookup unavailable/i)).toBeTruthy();
    });

    // Continue button should be disabled during error state
    const continueButton = screen.getByRole("button", {
      name: /continue to review/i,
    });
    expect((continueButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows error state on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("Failed to fetch"),
    );

    render(<ApplyEstimatePage />);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeTruthy();
    });
  });

  it("redirects to intake without stale clientId when draft load fails", async () => {
    const staleClientId = "aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    getMock.mockReturnValue(staleClientId);

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    render(<ApplyEstimatePage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/apply/intake");
    });
  });

  it("disables continue button while estimate is loading", async () => {
    // Use a promise that doesn't resolve immediately to test loading state
    let resolveEstimate: (value: Partial<Response>) => void;
    const estimatePromise = new Promise<Partial<Response>>((resolve) => {
      resolveEstimate = resolve;
    });

    vi.spyOn(globalThis, "fetch").mockReturnValue(
      estimatePromise as Promise<Response>,
    );

    render(<ApplyEstimatePage />);

    await waitFor(() => {
      const continueButton = screen.getByRole("button", {
        name: /continue to review/i,
      });
      expect((continueButton as HTMLButtonElement).disabled).toBe(true);
    });

    // Resolve the estimate
    resolveEstimate!(buildEstimateResponse());

    await waitFor(() => {
      const continueButton = screen.getByRole("button", {
        name: /continue to review/i,
      });
      expect((continueButton as HTMLButtonElement).disabled).toBe(false);
    });
  });
});
