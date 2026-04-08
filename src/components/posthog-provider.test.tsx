import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PostHogProvider } from "./posthog-provider";

const identifyUserMock = vi.fn();
const initPostHogMock = vi.fn();
const resetUserMock = vi.fn();
const trackEventMock = vi.fn();
const trackPageViewMock = vi.fn();

let mockSession: { user?: { id: string } } | null = null;
let mockPathname = "/dashboard";
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/server/better-auth/client", () => ({
  authClient: {
    useSession: () => ({ data: mockSession }),
  },
}));

vi.mock("@/lib/posthog", () => ({
  identifyUser: (...args: unknown[]) => identifyUserMock(...args),
  initPostHog: () => initPostHogMock(),
  resetUser: () => resetUserMock(),
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
  trackPageView: (...args: unknown[]) => trackPageViewMock(...args),
}));

describe("PostHogProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
    mockPathname = "/dashboard";
    mockSearchParams = new URLSearchParams();
  });

  it("resets PostHog when a signed-in user logs out", () => {
    mockSession = { user: { id: "user-1" } };

    const { rerender } = render(
      <PostHogProvider>
        <div>child</div>
      </PostHogProvider>,
    );

    mockSession = null;
    rerender(
      <PostHogProvider>
        <div>child</div>
      </PostHogProvider>,
    );

    expect(resetUserMock).toHaveBeenCalledTimes(1);
  });

  it("resets PostHog before identifying a different signed-in user", () => {
    mockSession = { user: { id: "user-1" } };

    const { rerender } = render(
      <PostHogProvider>
        <div>child</div>
      </PostHogProvider>,
    );

    mockSession = { user: { id: "user-2" } };
    rerender(
      <PostHogProvider>
        <div>child</div>
      </PostHogProvider>,
    );

    expect(resetUserMock).toHaveBeenCalledTimes(1);
    expect(identifyUserMock).toHaveBeenLastCalledWith(
      "user-2",
      expect.objectContaining({
        feature: "auth",
        source: "session",
      }),
    );
  });
});
