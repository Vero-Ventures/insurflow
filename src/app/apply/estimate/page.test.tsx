import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ApplyEstimatePage from "@/app/apply/estimate/page";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const getMock = vi.fn().mockReturnValue(null);
const useSessionMock = vi.fn();

function resolveRequestUrl(input: RequestInfo | URL): string {
  if (input instanceof URL) {
    return input.toString();
  }

  if (typeof input === "string") {
    return input;
  }

  return input.url;
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => ({ get: getMock }),
}));

vi.mock("@/server/better-auth/client", () => ({
  authClient: {
    useSession: () => useSessionMock(),
  },
}));

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

function buildDraftResponse(clientId: string): Partial<Response> {
  return {
    ok: true,
    json: async () => ({
      draft: {
        id: clientId,
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
        hasSpouse: false,
        spouseAge: null,
        youngestChildAge: null,
        additionalGoals: null,
        status: "draft",
      },
    }),
  };
}

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
    useSessionMock.mockReset();
    useSessionMock.mockReturnValue({ data: null, isPending: false });
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

  it("keeps guest estimate preview working without a persisted draft", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("should not call persisted estimate API"));

    render(<ApplyEstimatePage />);

    await waitFor(() => {
      expect(screen.getAllByText(/\$500,000/).length).toBeGreaterThan(0);
    });

    fireEvent.click(
      screen.getByRole("button", { name: /continue to review/i }),
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/apply/review");
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates a draft and forwards clientId for authenticated users", async () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "user-1" } },
      isPending: false,
    });

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input, init) => {
        const url = typeof input === "string" ? input : (input as Request).url;
        const method = init?.method ?? "GET";

        if (url === "/api/d2c/draft" && method === "POST") {
          return {
            ok: true,
            status: 201,
            json: async () => ({
              draft: { id: "aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
              existed: false,
            }),
          } as Response;
        }

        if (url === "/api/d2c/estimate" && method === "POST") {
          return buildEstimateResponse() as Response;
        }

        return { ok: false, status: 404, json: async () => ({}) } as Response;
      });

    render(<ApplyEstimatePage />);

    fireEvent.click(
      await screen.findByRole("button", { name: /continue to review/i }),
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        "/apply/review?clientId=aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa&estimateRunId=cccc1111-dddd-4ddd-8ddd-eeeeeeeeeeee",
      );
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/d2c/draft",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("displays server-calculated coverage and premium range", async () => {
    const testClientId = "aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    getMock.mockReturnValue(testClientId);
    useSessionMock.mockReturnValue({
      data: { user: { id: "user-1" } },
      isPending: false,
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;

      if (url.includes(`/api/d2c/draft/${testClientId}`)) {
        return buildDraftResponse(testClientId) as Response;
      }

      return buildEstimateResponse() as Response;
    });

    render(<ApplyEstimatePage />);

    await waitFor(() => {
      expect(screen.getAllByText(/\$970,000/).length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/\$42/)).toBeTruthy();
    expect(screen.getByText(/\$67/)).toBeTruthy();
  });

  it("navigates to review with estimateRunId", async () => {
    const testClientId = "aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    getMock.mockReturnValue(testClientId);
    useSessionMock.mockReturnValue({
      data: { user: { id: "user-1" } },
      isPending: false,
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;

      if (url.includes(`/api/d2c/draft/${testClientId}`)) {
        return buildDraftResponse(testClientId) as Response;
      }

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

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        expect.stringContaining(`estimateRunId=${MOCK_ESTIMATE_RUN_ID}`),
      );
    });
  });

  it("forwards clientId and estimateRunId to review URL when clientId present", async () => {
    const testClientId = "aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    getMock.mockReturnValue(testClientId);
    useSessionMock.mockReturnValue({
      data: { user: { id: "user-1" } },
      isPending: false,
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;

      if (url.includes("/api/d2c/draft/")) {
        return buildDraftResponse(testClientId) as Response;
      }

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

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        expect.stringContaining(`clientId=${testClientId}`),
      );
      expect(pushMock).toHaveBeenCalledWith(
        expect.stringContaining(`estimateRunId=${MOCK_ESTIMATE_RUN_ID}`),
      );
    });
  });

  it("passes family context into recommendation input", async () => {
    sessionStorage.setItem(
      "d2c_intake",
      JSON.stringify({
        province: "ON",
        dateOfBirth: "1990-05-15",
        tobaccoUse: false,
        annualIncome: 90_000,
        coverageAmount: 0,
        termYears: 20,
        gender: "male",
        healthClass: "standard",
        hasSpouse: true,
        spouseAge: 35,
        youngestChildAge: 6,
        additionalGoals: "",
      }),
    );

    render(<ApplyEstimatePage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /your estimate preview/i }),
      ).toBeTruthy();
    });

    expect(
      screen.getByText(/perfect for protecting young families/i),
    ).toBeTruthy();
  });

  it("shows error state when estimate API fails", async () => {
    const testClientId = "aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    getMock.mockReturnValue(testClientId);
    useSessionMock.mockReturnValue({
      data: { user: { id: "user-1" } },
      isPending: false,
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;

      if (url.includes(`/api/d2c/draft/${testClientId}`)) {
        return buildDraftResponse(testClientId) as Response;
      }

      return buildEstimateErrorResponse("Rate lookup unavailable") as Response;
    });

    render(<ApplyEstimatePage />);

    await waitFor(() => {
      expect(screen.getByText(/rate lookup unavailable/i)).toBeTruthy();
    });

    const continueButton = screen.getByRole("button", {
      name: /continue to review/i,
    });
    expect((continueButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows error state on network failure", async () => {
    const testClientId = "aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    getMock.mockReturnValue(testClientId);
    useSessionMock.mockReturnValue({
      data: { user: { id: "user-1" } },
      isPending: false,
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;

      if (url.includes(`/api/d2c/draft/${testClientId}`)) {
        return buildDraftResponse(testClientId) as Response;
      }

      throw new Error("Failed to fetch");
    });

    render(<ApplyEstimatePage />);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeTruthy();
    });
  });

  it("waits for auth resolution before dropping clientId on review navigation", async () => {
    useSessionMock.mockReturnValue({ data: null, isPending: true });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = init?.method ?? "GET";

      if (url === "/api/d2c/draft" && method === "POST") {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            draft: { id: "bbbb0000-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
          }),
        } as Response;
      }

      if (url === "/api/d2c/estimate" && method === "POST") {
        return buildEstimateResponse() as Response;
      }

      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });

    render(<ApplyEstimatePage />);

    fireEvent.click(
      await screen.findByRole("button", { name: /continue to review/i }),
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        "/apply/review?clientId=bbbb0000-bbbb-4bbb-8bbb-bbbbbbbbbbbb&estimateRunId=cccc1111-dddd-4ddd-8ddd-eeeeeeeeeeee",
      );
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
    const testClientId = "aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    getMock.mockReturnValue(testClientId);
    useSessionMock.mockReturnValue({
      data: { user: { id: "user-1" } },
      isPending: false,
    });

    let resolveEstimate: (value: Partial<Response>) => void;
    const estimatePromise = new Promise<Partial<Response>>((resolve) => {
      resolveEstimate = resolve;
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;

      if (url.includes(`/api/d2c/draft/${testClientId}`)) {
        return buildDraftResponse(testClientId) as Response;
      }

      return estimatePromise as Promise<Response>;
    });

    render(<ApplyEstimatePage />);

    await waitFor(() => {
      const continueButton = screen.getByRole("button", {
        name: /continue to review/i,
      });
      expect((continueButton as HTMLButtonElement).disabled).toBe(true);
    });

    resolveEstimate!(buildEstimateResponse());

    await waitFor(() => {
      const continueButton = screen.getByRole("button", {
        name: /continue to review/i,
      });
      expect((continueButton as HTMLButtonElement).disabled).toBe(false);
    });
  });

  it("keeps continue enabled for guests while no persisted draft exists", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("should not call persisted estimate API"));

    render(<ApplyEstimatePage />);

    await waitFor(() => {
      const continueButton = screen.getByRole("button", {
        name: /continue to review/i,
      });
      expect((continueButton as HTMLButtonElement).disabled).toBe(false);
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
