import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((path: string) => {
  throw new Error(`redirect:${path}`);
});
const getSessionMock = vi.fn();
const findClientMock = vi.fn();

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

vi.mock("./review-form", () => ({
  default: ({ clientId }: { clientId: string }) => ({
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
});
