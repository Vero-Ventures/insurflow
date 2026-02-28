import { describe, expect, it } from "vitest";

import { ADVISOR_WORKSPACE_ROUTE } from "@/lib/app-routes";
import {
  getDashboardExperience,
  normalizeAccountType,
} from "@/lib/role-experience";

describe("DashboardPage", () => {
  it("returns client dashboard experience by default", () => {
    const accountType = normalizeAccountType(undefined) ?? "client";
    const experience = getDashboardExperience(accountType);

    expect(experience.heading).toMatch(/continue your application/i);
    expect(experience.cards[0]?.href).toBe("/apply/review");
  });

  it("returns advisor dashboard experience", () => {
    const experience = getDashboardExperience("advisor");

    expect(experience.heading).toMatch(/advisor workspace/i);
    expect(experience.cards[0]?.href).toBe(ADVISOR_WORKSPACE_ROUTE);
  });
});
