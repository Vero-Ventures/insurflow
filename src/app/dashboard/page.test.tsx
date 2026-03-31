import { describe, expect, it } from "vitest";

import {
  getDashboardExperience,
  normalizeAccountType,
} from "@/lib/role-experience";
import { withDraftClientId } from "./page";

describe("DashboardPage", () => {
  it("returns client dashboard experience by default", () => {
    const accountType = normalizeAccountType(undefined) ?? "client";
    const experience = getDashboardExperience(accountType);

    expect(experience.heading).toMatch(/keep going with your application/i);
    expect(experience.cards[0]?.href).toBe("/apply/review");
  });

  it("uses consumer dashboard messaging", () => {
    const experience = getDashboardExperience("client");

    expect(experience.heading).toMatch(/application/i);
    expect(experience.cards[0]?.href).toBe("/apply/review");
    expect(experience.description).toMatch(/provider/i);
  });

  it("appends clientId for estimate and review cards when draft exists", () => {
    const clientId = "aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    expect(withDraftClientId("/apply/review", clientId)).toBe(
      "/apply/review?clientId=aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    expect(withDraftClientId("/apply/estimate", clientId)).toBe(
      "/apply/estimate?clientId=aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    expect(withDraftClientId("/apply/intake", clientId)).toBe("/apply/intake");
  });
});
