import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import ReviewForm from "./review-form";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@daveyplate/better-auth-ui", () => ({
  SignedIn: ({ children }: { children: ReactNode }) => children,
  SignedOut: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/lib/d2c/intake-storage", () => ({
  loadD2cIntake: () => ({
    province: "ON",
    dateOfBirth: "1990-01-01",
    tobaccoUse: false,
    annualIncome: 100000,
    coverageAmount: 500000,
    termYears: 20,
  }),
}));

vi.mock("@/lib/d2c/compliance-config", () => ({
  complianceConfig: {
    transmitConsentText: "Transmit",
    healthAuthorizationText: "Health",
    esignIntentText: "E-sign",
  },
}));

vi.mock("@/app/apply/submit/actions", () => ({
  submitApplicationAction: vi.fn(),
}));

describe("ReviewForm", () => {
  it("keeps clientId context when navigating back to estimate", async () => {
    render(<ReviewForm clientId="aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa" />);

    fireEvent.click(screen.getByRole("button", { name: /back to estimate/i }));

    expect(pushMock).toHaveBeenCalledWith(
      "/apply/estimate?clientId=aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
  });
});
