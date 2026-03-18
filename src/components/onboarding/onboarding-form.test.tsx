import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OnboardingForm } from "./onboarding-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("OnboardingForm location selector", () => {
  it("shows Province/Territory label with Canadian options only", () => {
    render(
      <OnboardingForm
        initialProfile={{
          firstName: "Ari",
          lastName: "North",
          state: "ON",
        }}
      />,
    );

    expect(screen.getByLabelText(/province\/territory/i)).toBeTruthy();
    expect(
      screen.getByRole("option", {
        name: /select your province or territory/i,
      }),
    ).toBeTruthy();
    expect(screen.getByRole("option", { name: /ontario/i })).toBeTruthy();
    expect(screen.getByRole("option", { name: /quebec/i })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /alabama/i })).toBeNull();
    expect(screen.queryByRole("option", { name: /california/i })).toBeNull();
  });

  it("does not render an applicant type field", () => {
    render(
      <OnboardingForm
        initialProfile={{
          firstName: "Ari",
          lastName: "North",
          state: "ON",
        }}
      />,
    );

    // accountType defaults to "client" server-side; the field is not shown to users
    expect(screen.queryByLabelText(/applicant type/i)).toBeNull();
    expect(screen.queryByRole("option", { name: /advisor/i })).toBeNull();
    expect(screen.queryByText(/advisor workflow/i)).toBeNull();
  });
});
