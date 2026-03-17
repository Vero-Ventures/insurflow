import { render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";

import DemoHandoffPage from "./page";

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

describe("DemoHandoffPage", () => {
  it("uses provider-matching language instead of advisor language", () => {
    render(<DemoHandoffPage />);

    expect(screen.getByText(/move toward a best-fit provider/i)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /create your account/i }),
    ).toBeTruthy();
    expect(screen.queryByText(/licensed advisor/i)).toBeNull();
    expect(screen.queryByText(/connect with an advisor/i)).toBeNull();
  });
});
