import { describe, expect, it } from "vitest";

import {
  getAccountTypeConfirmation,
  getDashboardExperience,
  normalizeAccountType,
  resolveOnboardingAccountType,
} from "@/lib/role-experience";

describe("role experience helpers", () => {
  it("normalizes supported account values", () => {
    expect(normalizeAccountType("advisor")).toBe(null);
    expect(normalizeAccountType("client")).toBe("client");
    expect(normalizeAccountType("invalid")).toBe(null);
  });

  it("uses persisted consumer account type when present", () => {
    expect(
      resolveOnboardingAccountType({
        profileAccountType: "client",
      }),
    ).toBe("client");
  });

  it("defaults onboarding to the consumer account type", () => {
    expect(
      resolveOnboardingAccountType({
        profileAccountType: undefined,
      }),
    ).toBe("client");
  });

  it("returns consumer dashboard content", () => {
    const clientExperience = getDashboardExperience("client");

    expect(clientExperience.heading).toMatch(
      /keep going with your application/i,
    );
    expect(clientExperience.description).toMatch(/provider/i);
  });

  it("uses production dashboard destinations instead of demo routes", () => {
    const clientExperience = getDashboardExperience("client");

    expect(
      clientExperience.cards.every((card) => !card.href.startsWith("/demo")),
    ).toBe(true);
    expect(clientExperience.cards[1]?.href).toBe("/apply/estimate");
  });

  it("returns role confirmation copy for onboarding", () => {
    expect(getAccountTypeConfirmation("client")?.title).toMatch(
      /consumer account selected/i,
    );
    expect(getAccountTypeConfirmation("client")?.description).toMatch(
      /provider/i,
    );
    expect(getAccountTypeConfirmation("advisor")).toBeNull();
    expect(getAccountTypeConfirmation("")).toBeNull();
  });
});
