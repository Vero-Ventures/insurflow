import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((path: string) => {
  throw new Error(`redirect:${path}`);
});
const getSessionMock = vi.fn();
const findClientMock = vi.fn();
const createDraftMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/server/better-auth/server", () => ({
  getSession: getSessionMock,
}));

vi.mock("@/server/db", () => ({
  getDb: () => ({
    query: {
      client: {
        findFirst: findClientMock,
      },
    },
  }),
}));

vi.mock("@/lib/api/d2c-draft-helpers", () => ({
  createDraft: (...args: unknown[]) => createDraftMock(...args),
}));

vi.mock("./review-form", () => ({
  default: ({ clientId }: { clientId: string | null }) => ({
    type: "review-form",
    props: { clientId },
  }),
}));

describe("ApplyReviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
    findClientMock.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
    });
    createDraftMock.mockResolvedValue({
      success: true,
      draft: { id: "22222222-2222-4222-8222-222222222222" },
      existed: false,
    });
  });

  it("falls back to owned draft client when clientId query param is missing", async () => {
    const { default: ApplyReviewPage } = await import("./page");

    const page = await ApplyReviewPage({ searchParams: Promise.resolve({}) });

    expect(redirectMock).not.toHaveBeenCalled();
    expect(findClientMock).toHaveBeenCalledTimes(1);
    expect(page).toMatchObject({
      props: { clientId: "11111111-1111-4111-8111-111111111111" },
    });
  });

  it("renders review form for signed-out users without forcing auth redirect", async () => {
    getSessionMock.mockResolvedValue(null);
    const { default: ApplyReviewPage } = await import("./page");

    const page = await ApplyReviewPage({ searchParams: Promise.resolve({}) });

    expect(redirectMock).not.toHaveBeenCalled();
    expect(findClientMock).not.toHaveBeenCalled();
    expect(page).toMatchObject({
      props: { clientId: null },
    });
  });

  it("auto-creates a draft when authenticated user has none", async () => {
    findClientMock.mockResolvedValue(null);
    const { default: ApplyReviewPage } = await import("./page");

    const page = await ApplyReviewPage({ searchParams: Promise.resolve({}) });

    expect(redirectMock).not.toHaveBeenCalled();
    expect(createDraftMock).toHaveBeenCalledWith("u1");
    expect(page).toMatchObject({
      props: { clientId: "22222222-2222-4222-8222-222222222222" },
    });
  });
});
