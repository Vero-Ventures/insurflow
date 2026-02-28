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
  it("renders primary signed-out CTA linking to /apply/intake", () => {
    render(<AuthStatus />);

    const signedOutContainer = screen.getByTestId("signed-out");
    const primaryCta = within(signedOutContainer).getByRole("link", {
      name: /start application/i,
    });

    expect(primaryCta.getAttribute("href")).toBe("/apply/intake");
  });

  it("does not link to /demo for signed-out users", () => {
    render(<AuthStatus />);

    const signedOutContainer = screen.getByTestId("signed-out");
    const links = within(signedOutContainer).getAllByRole("link");

    const demoLink = links.find(
      (link) => link.getAttribute("href") === "/demo",
    );
    expect(demoLink).toBeUndefined();
  });
});
