import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDraftPersistence } from "../use-draft-persistence";
import { D2C_INTAKE_STORAGE_KEY } from "../intake-storage";

const mockUseSession = vi.fn();

vi.mock("@/server/better-auth/client", () => ({
  authClient: {
    useSession: () => mockUseSession(),
  },
}));

interface DeferredResponse {
  promise: Promise<Response>;
  resolve: (response: Response) => void;
}

function createDeferredResponse(): DeferredResponse {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

function createDraftResponse(clientId: string): Response {
  return new Response(
    JSON.stringify({
      draft: {
        id: clientId,
        firstName: "",
        lastName: "",
        dateOfBirth: "2000-01-01",
        sex: "M",
        province: "NY",
        smoker: false,
        healthRating: "standard",
        clientIncome: "0",
        existingLifeInsuranceCoverage: "0",
        replacementDurationYears: 20,
        status: "draft",
      },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

describe("useDraftPersistence", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" } },
      isPending: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("does not start a second PATCH while the first save is in flight", async () => {
    const patchBodies: Array<{ intake?: { annualIncome?: number } }> = [];
    const deferredPatchResponses: DeferredResponse[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (method === "GET" && url.endsWith("/api/d2c/draft/client-1")) {
          return Promise.resolve(createDraftResponse("client-1"));
        }

        if (method === "PATCH" && url.endsWith("/api/d2c/draft/client-1")) {
          patchBodies.push(JSON.parse(String(init?.body ?? "{}")));
          const deferred = createDeferredResponse();
          deferredPatchResponses.push(deferred);
          return deferred.promise;
        }

        return Promise.resolve(new Response(null, { status: 404 }));
      }),
    );

    const { result } = renderHook(() =>
      useDraftPersistence({ initialClientId: "client-1" }),
    );

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
    });

    vi.useFakeTimers();

    act(() => {
      result.current.updateField("annualIncome", 100000);
    });

    await act(async () => {
      vi.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(patchBodies).toHaveLength(1);

    act(() => {
      result.current.updateField("annualIncome", 200000);
    });

    await act(async () => {
      vi.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(patchBodies).toHaveLength(1);

    await act(async () => {
      deferredPatchResponses[0]?.resolve(new Response(null, { status: 200 }));
      await Promise.resolve();
    });

    expect(patchBodies).toHaveLength(2);
    expect(patchBodies[1]?.intake?.annualIncome).toBe(200000);
  });

  it("does not hydrate authenticated users from sessionStorage when no draft exists", async () => {
    const postBodies: Array<{ intake?: { annualIncome?: number } }> = [];

    sessionStorage.setItem(
      D2C_INTAKE_STORAGE_KEY,
      JSON.stringify({ annualIncome: 777777 }),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (method === "GET" && url.endsWith("/api/d2c/draft")) {
          return Promise.resolve(new Response(null, { status: 404 }));
        }

        if (method === "POST" && url.endsWith("/api/d2c/draft")) {
          postBodies.push(JSON.parse(String(init?.body ?? "{}")));
          return Promise.resolve(
            new Response(
              JSON.stringify({
                draft: {
                  id: "client-2",
                  firstName: "",
                  lastName: "",
                  dateOfBirth: "2000-01-01",
                  sex: "M",
                  province: "NY",
                  smoker: false,
                  healthRating: "standard",
                  clientIncome: "0",
                  existingLifeInsuranceCoverage: "0",
                  replacementDurationYears: 20,
                  status: "draft",
                },
              }),
              {
                status: 201,
                headers: { "Content-Type": "application/json" },
              },
            ),
          );
        }

        if (method === "PATCH" && url.endsWith("/api/d2c/draft/client-2")) {
          return Promise.resolve(new Response(null, { status: 200 }));
        }

        return Promise.resolve(new Response(null, { status: 404 }));
      }),
    );

    const { result } = renderHook(() => useDraftPersistence());

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
    });

    expect(result.current.intake.annualIncome).toBe(0);

    vi.useFakeTimers();

    act(() => {
      result.current.updateField("annualIncome", 123000);
    });

    await act(async () => {
      vi.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    expect(postBodies).toHaveLength(1);
    expect(postBodies[0]?.intake?.annualIncome).toBe(123000);
  });
});
