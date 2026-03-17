import { render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";

import AuthPage from "./page";

vi.mock("@daveyplate/better-auth-ui", () => ({
  AuthView: ({ path }: { path: string }) => <div>auth-view-{path}</div>,
}));

vi.mock("@daveyplate/better-auth-ui/server", () => ({
  authViewPaths: { signIn: "sign-in", signUp: "sign-up" },
}));

vi.mock("next/image", () => ({
  default: ({
    priority: _priority,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

describe("AuthPage", () => {
  it("uses consumer broker messaging on sign up", async () => {
    const page = await AuthPage({
      params: Promise.resolve({ path: "sign-up" }),
    });
    render(page);

    expect(screen.getByText(/find the right provider/i)).toBeTruthy();
    expect(screen.getByText(/canadian term life shoppers/i)).toBeTruthy();
  });
});
