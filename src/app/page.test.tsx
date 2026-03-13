import { render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";

import Home from "@/app/page";

vi.mock("@/components/auth-status", () => ({
  AuthStatus: () => <div>auth-status</div>,
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("Home page consumer direction", () => {
  it("uses consumer-first journey language", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        name: /simpler way to apply for term life insurance/i,
      }),
    ).toBeTruthy();
    expect(screen.getAllByText(/estimate/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/no confusing forms, no jargon/i)).toBeTruthy();
    expect(screen.queryByText(/advisor handoff/i)).toBeNull();
  });
});
