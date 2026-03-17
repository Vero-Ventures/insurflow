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

  it("ignores advisor role hint when profile does not have an account type", () => {
    expect(
      resolveOnboardingAccountType({
        profileAccountType: undefined,
        roleIntent: "advisor",
      }),
    ).toBeUndefined();
  });

  it("uses client role hint when profile does not have an account type", () => {
    expect(
      resolveOnboardingAccountType({
        profileAccountType: undefined,
        roleIntent: "client",
      }),
    ).toBe("client");
  });

  it("returns consumer dashboard content for both account types", () => {
    const advisorExperience = getDashboardExperience("advisor");
    const clientExperience = getDashboardExperience("client");

    expect(advisorExperience.heading).toMatch(/application/i);
    expect(clientExperience.heading).toMatch(
      /keep going with your application/i,
    );
    expect(advisorExperience.cards[0]?.title).toBe(
      clientExperience.cards[0]?.title,
    );
  });

  it("maps advisor accounts into the consumer dashboard experience", () => {
    const experience = getDashboardExperience("advisor");

    expect(experience.heading).toMatch(/application/i);
    expect(experience.description).toMatch(/provider/i);
    expect(
      experience.cards.every((card) => !card.href.startsWith("/clients")),
    ).toBe(true);
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
    expect(advisorExperience.cards[1]?.href).toBe("/apply/estimate");
  });

  it("returns role confirmation copy for onboarding", () => {
    expect(getAccountTypeConfirmation("advisor")?.title).toMatch(
      /consumer account selected/i,
    );
    expect(getAccountTypeConfirmation("client")?.title).toMatch(
      /consumer account selected/i,
    );
    expect(getAccountTypeConfirmation("client")?.description).toMatch(
      /provider/i,
    );
    expect(getAccountTypeConfirmation("")).toBeNull();
  });
});
