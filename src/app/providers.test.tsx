import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Providers } from "./providers";

const refreshMock = vi.fn();
const pushMock = vi.fn();
const replaceMock = vi.fn();

let mockPathname = "/dashboard";
let capturedOnSessionChange: (() => void) | undefined;
let capturedCredentials: { forgotPassword?: boolean } | undefined;

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
    push: pushMock,
    replace: replaceMock,
  }),
  usePathname: () => mockPathname,
}));

vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@daveyplate/better-auth-ui", () => ({
  AuthUIProvider: ({
    children,
    onSessionChange,
    credentials,
  }: {
    children: React.ReactNode;
    onSessionChange?: () => void;
    credentials?: { forgotPassword?: boolean };
  }) => {
    capturedOnSessionChange = onSessionChange;
    capturedCredentials = credentials;
    return children;
  },
}));

vi.mock("@/server/better-auth/client", () => ({
  authClient: {},
}));

describe("Providers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/dashboard";
    capturedOnSessionChange = undefined;
    capturedCredentials = undefined;
  });

  it("refreshes on each session change outside onboarding", () => {
    render(
      <Providers socialProviderIds={[]}>
        <div>child</div>
      </Providers>,
    );

    expect(capturedOnSessionChange).toBeDefined();
    capturedOnSessionChange?.();
    capturedOnSessionChange?.();

    expect(refreshMock).toHaveBeenCalledTimes(2);
  });

  it("does not refresh on onboarding route", () => {
    mockPathname = "/onboarding";

    render(
      <Providers socialProviderIds={[]}>
        <div>child</div>
      </Providers>,
    );

    capturedOnSessionChange?.();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("explicitly enables forgot password for credentials auth", () => {
    render(
      <Providers socialProviderIds={[]}>
        <div>child</div>
      </Providers>,
    );

    expect(capturedCredentials).toEqual({ forgotPassword: true });
  });
});
