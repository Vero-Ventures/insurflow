import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import D2cIntakePage from "@/app/apply/intake/page";

const { pushMock, searchParamGetMock, useSessionMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  searchParamGetMock: vi.fn().mockReturnValue(null),
  useSessionMock: vi.fn<
    () => {
      data: { user: { id: string } } | null;
      isPending: boolean;
    }
  >(() => ({ data: null, isPending: false })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: searchParamGetMock }),
}));

// Mock the auth client to simulate unauthenticated user (sessionStorage fallback)
vi.mock("@/server/better-auth/client", () => ({
  authClient: {
    useSession: useSessionMock,
  },
}));

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
});

describe("D2cIntakePage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    searchParamGetMock.mockReset();
    searchParamGetMock.mockReturnValue(null);
    useSessionMock.mockReset();
    useSessionMock.mockReturnValue({ data: null, isPending: false });
    sessionStorageMock.clear();
    sessionStorageMock.getItem.mockClear();
    sessionStorageMock.setItem.mockClear();
    vi.restoreAllMocks();
  });

  it("renders province field", async () => {
    render(<D2cIntakePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/province/i)).toBeTruthy();
    });
  });

  it("renders all required eligibility fields", async () => {
    render(<D2cIntakePage />);

    await waitFor(() => {
      // Province select
      expect(screen.getByLabelText(/province/i)).toBeTruthy();
      // Date of birth
      expect(screen.getByLabelText(/date of birth/i)).toBeTruthy();
      // Tobacco use
      expect(screen.getByLabelText(/tobacco products/i)).toBeTruthy();
      // Annual income
      expect(screen.getByLabelText(/annual income/i)).toBeTruthy();
    });
  });

  it("renders optional coverage fields", async () => {
    render(<D2cIntakePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/desired coverage/i)).toBeTruthy();
      expect(screen.getByLabelText(/term length/i)).toBeTruthy();
    });
  });

  it("navigates to /apply/fact-finding when continue button is clicked with valid form", async () => {
    render(<D2cIntakePage />);

    // Wait for hydration
    await waitFor(() => {
      expect(screen.getByLabelText(/province/i)).toBeTruthy();
    });

    // Fill required fields
    // Select province
    const provinceSelect = screen.getByLabelText(/province/i);
    fireEvent.click(provinceSelect);
    const ontarioOption = await screen.findByRole("option", {
      name: /ontario/i,
    });
    fireEvent.click(ontarioOption);

    // Fill date of birth
    const dobInput = screen.getByLabelText(/date of birth/i);
    fireEvent.change(dobInput, { target: { value: "1990-05-15" } });

    // Fill annual income
    const incomeInput = screen.getByLabelText(/annual income/i);
    fireEvent.change(incomeInput, { target: { value: "75000" } });

    // Click continue
    const continueButton = screen.getByRole("button", {
      name: /continue to fact finding/i,
    });
    fireEvent.click(continueButton);

    expect(pushMock).toHaveBeenCalledWith("/apply/fact-finding");
  });

  it("disables continue button when required fields are empty", async () => {
    render(<D2cIntakePage />);

    await waitFor(() => {
      const continueButton = screen.getByRole("button", {
        name: /continue to fact finding/i,
      });
      expect(continueButton.getAttribute("disabled")).not.toBeNull();
    });
  });

  it("saves intake data to sessionStorage when fields change", async () => {
    render(<D2cIntakePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/annual income/i)).toBeTruthy();
    });

    const incomeInput = screen.getByLabelText(/annual income/i);
    fireEvent.change(incomeInput, { target: { value: "100000" } });

    expect(sessionStorageMock.setItem).toHaveBeenCalled();
  });

  it("displays Canadian provinces in the province select", async () => {
    render(<D2cIntakePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/province/i)).toBeTruthy();
    });

    const provinceSelect = screen.getByLabelText(/province/i);
    fireEvent.click(provinceSelect);

    // Check for some key provinces
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /ontario/i })).toBeTruthy();
      expect(
        screen.getByRole("option", { name: /british columbia/i }),
      ).toBeTruthy();
      expect(screen.getByRole("option", { name: /alberta/i })).toBeTruthy();
      expect(screen.getByRole("option", { name: /quebec/i })).toBeTruthy();
    });
  });

  it("drops stale clientId when resume draft cannot be loaded", async () => {
    const staleClientId = "aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    searchParamGetMock.mockReturnValue(staleClientId);
    useSessionMock.mockReturnValue({
      data: { user: { id: "user_123" } },
      isPending: false,
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
    } as Response);

    render(<D2cIntakePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/annual income/i)).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/date of birth/i), {
      target: { value: "1990-05-15" },
    });
    fireEvent.change(screen.getByLabelText(/annual income/i), {
      target: { value: "75000" },
    });
    fireEvent.click(screen.getByLabelText(/province/i));
    fireEvent.click(await screen.findByRole("option", { name: /ontario/i }));

    fireEvent.click(
      screen.getByRole("button", { name: /continue to fact finding/i }),
    );

    expect(pushMock).toHaveBeenCalledWith("/apply/fact-finding");
  });
});
