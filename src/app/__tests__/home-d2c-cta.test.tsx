import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock the better-auth-ui components
vi.mock("@daveyplate/better-auth-ui", () => ({
  SignedIn: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="signed-in">{children}</div>
  ),
  SignedOut: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="signed-out">{children}</div>
  ),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ alt, ...props }: { alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

import { AuthStatus } from "@/components/auth-status";

describe("Home page D2C CTA", () => {
  it("renders primary signed-out CTA linking to sign-up with client role", () => {
    render(<AuthStatus />);

    const signedOutContainer = screen.getByTestId("signed-out");
    const primaryCta = within(signedOutContainer).getByRole("link", {
      name: /start application/i,
    });

    expect(primaryCta.getAttribute("href")).toBe("/auth/sign-up?role=client");
  });

  it("renders demo as the secondary signed-out CTA", () => {
    render(<AuthStatus />);

    const signedOutContainer = screen.getByTestId("signed-out");
    const links = within(signedOutContainer).getAllByRole("link");
    const hrefs = links.map((link) => link.getAttribute("href"));

    expect(hrefs[0]).toBe("/auth/sign-up?role=client");
    expect(hrefs[1]).toBe("/demo");
    expect(hrefs[2]).toBe("/auth/sign-in");
  });
});
