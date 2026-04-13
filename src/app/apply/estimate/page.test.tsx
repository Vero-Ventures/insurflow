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

vi.mock("@/lib/auth/auth-client", () => ({
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
    useSessionMock.mockReturnValue({ data: null, isPending: false });
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
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/apply/review");
    });
  });

  it("creates a draft and forwards clientId for authenticated users", async () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "user-1" } },
      isPending: false,
    });

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        draft: { id: "aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
        existed: false,
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

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/d2c/draft",
      expect.objectContaining({ method: "POST" }),
    );
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
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        `/apply/review?clientId=${testClientId}`,
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
        annualIncome: 90000,
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

  it("blocks review navigation while auth session is pending", async () => {
    useSessionMock.mockReturnValue({ data: null, isPending: true });

    const fetchMock = vi.spyOn(globalThis, "fetch");

    render(<ApplyEstimatePage />);

    const continueButton = await screen.findByRole("button", {
      name: /continue to review/i,
    });

    expect((continueButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(continueButton);

    expect(pushMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("syncs the estimate coverage before navigating to review when a draft exists", async () => {
    const testClientId = "aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    getMock.mockReturnValue(testClientId);

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = resolveRequestUrl(input);
          const method = init?.method ?? "GET";

          if (
            method === "GET" &&
            url.endsWith(`/api/d2c/draft/${testClientId}`)
          ) {
            return {
              ok: true,
              status: 200,
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
                  existingLifeInsuranceCoverage: "0",
                  replacementDurationYears: 20,
                  hasSpouse: false,
                  spouseAge: null,
                  youngestChildAge: null,
                  additionalGoals: null,
                  status: "draft",
                },
              }),
            } as Response;
          }

          if (
            method === "PATCH" &&
            url.endsWith(`/api/d2c/draft/${testClientId}`)
          ) {
            return {
              ok: true,
              status: 200,
              json: async () => ({ draft: { id: testClientId } }),
            } as Response;
          }

          return { ok: false, status: 404 } as Response;
        },
      );

    render(<ApplyEstimatePage />);

    const continueButton = await screen.findByRole("button", {
      name: /continue to review/i,
    });

    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/d2c/draft/${testClientId}`,
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    const patchCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith(`/api/d2c/draft/${testClientId}`) &&
        init?.method === "PATCH",
    );

    expect(patchCall).toBeDefined();
    expect(JSON.parse(String(patchCall?.[1]?.body))).toMatchObject({
      intake: { coverageAmount: 970000 },
    });
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
