import { describe, expect, it } from "vitest";

import {
  getAccountTypeConfirmation,
  getDashboardExperience,
  normalizeAccountType,
  resolveOnboardingAccountType,
} from "@/lib/role-experience";

describe("role experience helpers", () => {
  it("normalizes role intent from query values", () => {
    expect(normalizeAccountType("advisor")).toBe("advisor");
    expect(normalizeAccountType("client")).toBe("client");
    expect(normalizeAccountType("invalid")).toBe(null);
  });

  it("prefers persisted profile account type over query role hint", () => {
    expect(
      resolveOnboardingAccountType({
        profileAccountType: "advisor",
        roleIntent: "client",
      }),
    ).toBe("advisor");
  });

  it("uses role hint when profile does not have an account type", () => {
    expect(
      resolveOnboardingAccountType({
        profileAccountType: undefined,
        roleIntent: "advisor",
      }),
    ).toBe("advisor");
  });

  it("returns role-specific dashboard content", () => {
    const advisorExperience = getDashboardExperience("advisor");
    const clientExperience = getDashboardExperience("client");

    expect(advisorExperience.heading).toMatch(/advisor workspace/i);
    expect(clientExperience.heading).toMatch(/continue your application/i);
    expect(advisorExperience.cards[0]?.title).not.toBe(
      clientExperience.cards[0]?.title,
    );
  });

  it("uses production dashboard destinations instead of demo routes", () => {
    const advisorExperience = getDashboardExperience("advisor");
    const clientExperience = getDashboardExperience("client");

    expect(
      advisorExperience.cards.every((card) => !card.href.startsWith("/demo")),
    ).toBe(true);
    expect(
      clientExperience.cards.every((card) => !card.href.startsWith("/demo")),
    ).toBe(true);
    expect(advisorExperience.cards[1]?.href).toContain("intent=create");
  });

  it("returns role confirmation copy for onboarding", () => {
    expect(getAccountTypeConfirmation("advisor")?.title).toMatch(
      /advisor account selected/i,
    );
    expect(getAccountTypeConfirmation("client")?.title).toMatch(
      /client account selected/i,
    );
    expect(getAccountTypeConfirmation("client")?.description).toMatch(
      /application-focused dashboard/i,
    );
    expect(getAccountTypeConfirmation("")).toBeNull();
  });
});
