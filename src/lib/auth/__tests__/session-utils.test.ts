import { describe, expect, it } from "vitest";

import { getSessionUserId, normalizeSessionUserId } from "../session-utils";

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

describe("normalizeSessionUserId", () => {
  it("hydrates session.user.id from session.session.userId", () => {
    const session = {
      user: {
        email: "advisor@example.com",
      },
      session: {
        userId: "user_789",
      },
    };

    const normalized = normalizeSessionUserId(session);

    expect(normalized).toEqual({
      user: {
        email: "advisor@example.com",
        id: "user_789",
      },
      session: {
        userId: "user_789",
      },
    });
  });

  it("returns original object when no fallback user id exists", () => {
    const session = {
      user: {
        email: "advisor@example.com",
      },
    };

    expect(normalizeSessionUserId(session)).toBe(session);
  });
});
