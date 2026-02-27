import { describe, expect, it } from "vitest";

import { getSessionUserId } from "../session-utils";

describe("getSessionUserId", () => {
  it("returns user.id when present", () => {
    const session = {
      user: {
        id: "user_123",
      },
    };

    expect(getSessionUserId(session)).toBe("user_123");
  });

  it("falls back to session.userId when user object is missing", () => {
    const session = {
      session: {
        userId: "user_456",
      },
    };

    expect(getSessionUserId(session)).toBe("user_456");
  });

  it("returns null when no user id is available", () => {
    expect(getSessionUserId({ user: {} })).toBeNull();
    expect(getSessionUserId(null)).toBeNull();
  });
});
