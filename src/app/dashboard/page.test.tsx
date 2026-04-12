import { describe, expect, it } from "vitest";

import {
  getDashboardExperience,
  normalizeAccountType,
} from "@/lib/role-experience";
import { resolveAiChatClientId, withDraftClientId } from "./page";

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

  it("prefers draft clientId for AI chat when both exist", () => {
    expect(
      resolveAiChatClientId(
        "draft-1111-1111-4111-8111-111111111111",
        "submitted-2222-2222-4222-8222-222222222222",
      ),
    ).toBe("draft-1111-1111-4111-8111-111111111111");
  });

  it("falls back to submitted clientId for AI chat", () => {
    expect(
      resolveAiChatClientId(null, "submitted-2222-2222-4222-8222-222222222222"),
    ).toBe("submitted-2222-2222-4222-8222-222222222222");
  });

  it("returns null for AI chat when no client context exists", () => {
    expect(resolveAiChatClientId(null, null)).toBeNull();
  });
});
