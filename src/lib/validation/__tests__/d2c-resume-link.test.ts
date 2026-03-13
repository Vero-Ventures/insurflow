/**
 * @fileoverview Unit tests for D2C resume link validation schemas.
 */

import { describe, expect, it } from "vitest";

import {
  createResumeLinkSchema,
  resumeLinkTokenSchema,
  RESUME_LINK_TOKEN_REGEX,
  RESUME_LINK_TTL_MS,
  RESUME_LINK_TTL_HOURS,
} from "../d2c-resume-link";

import {
  generateValidToken,
  TEST_UUIDS,
} from "@/lib/api/__tests__/helpers/d2c-resume-link-test-helpers";

function buildDeterministicToken(parts: string[]): string {
  return parts.join("");
}

describe("createResumeLinkSchema", () => {
  it("accepts valid client ID", () => {
    const result = createResumeLinkSchema.safeParse({
      clientId: TEST_UUIDS.validClientId,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID format", () => {
    const result = createResumeLinkSchema.safeParse({
      clientId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing clientId", () => {
    const result = createResumeLinkSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty clientId", () => {
    const result = createResumeLinkSchema.safeParse({
      clientId: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("resumeLinkTokenSchema", () => {
  it("accepts valid 43-character URL-safe base64 token", () => {
    const generatedToken = generateValidToken();
    const result = resumeLinkTokenSchema.safeParse(generatedToken);
    expect(result.success).toBe(true);
  });

  it("accepts tokens with underscores and hyphens", () => {
    const tokenWithUrlSafeChars = buildDeterministicToken([
      "A".repeat(20),
      "_",
      "B".repeat(10),
      "-",
      "C".repeat(11),
    ]);

    expect(tokenWithUrlSafeChars.length).toBe(43);
    const result = resumeLinkTokenSchema.safeParse(tokenWithUrlSafeChars);
    expect(result.success).toBe(true);
  });

  it("rejects tokens that are too short", () => {
    const result = resumeLinkTokenSchema.safeParse("shorttoken");
    expect(result.success).toBe(false);
  });

  it("rejects tokens that are too long", () => {
    const result = resumeLinkTokenSchema.safeParse("a".repeat(44));
    expect(result.success).toBe(false);
  });

  it("rejects tokens with invalid characters", () => {
    // Token with spaces
    const result1 = resumeLinkTokenSchema.safeParse(
      "abc def ghi jkl mno pqr stu vwx yz 123 456",
    );
    expect(result1.success).toBe(false);

    // Token with special characters
    const result2 = resumeLinkTokenSchema.safeParse(
      "abc!@#$%^&*()+=[]{}|;:',.<>?/~`12345678",
    );
    expect(result2.success).toBe(false);
  });

  it("rejects empty string", () => {
    const result = resumeLinkTokenSchema.safeParse("");
    expect(result.success).toBe(false);
  });
});

describe("RESUME_LINK_TOKEN_REGEX", () => {
  it("matches valid tokens", () => {
    const validTokenAlpha = buildDeterministicToken([
      "A".repeat(14),
      "b".repeat(14),
      "1".repeat(15),
    ]);

    const validTokenUrlSafe = buildDeterministicToken([
      "x".repeat(12),
      "_",
      "y".repeat(15),
      "-",
      "z".repeat(14),
    ]);

    expect(validTokenAlpha.length).toBe(43);
    expect(validTokenUrlSafe.length).toBe(43);
    expect(RESUME_LINK_TOKEN_REGEX.test(validTokenAlpha)).toBe(true);
    expect(RESUME_LINK_TOKEN_REGEX.test(validTokenUrlSafe)).toBe(true);
  });

  it("rejects invalid tokens", () => {
    expect(RESUME_LINK_TOKEN_REGEX.test("short")).toBe(false);
    expect(RESUME_LINK_TOKEN_REGEX.test("a".repeat(44))).toBe(false);
    expect(
      RESUME_LINK_TOKEN_REGEX.test(
        "token with spaces here 1234567890123456789",
      ),
    ).toBe(false);
  });
});

describe("TTL constants", () => {
  it("TTL is 24 hours in milliseconds", () => {
    expect(RESUME_LINK_TTL_MS).toBe(24 * 60 * 60 * 1000);
    expect(RESUME_LINK_TTL_MS).toBe(86_400_000);
  });

  it("TTL hours constant matches milliseconds", () => {
    expect(RESUME_LINK_TTL_HOURS).toBe(24);
    expect(RESUME_LINK_TTL_HOURS * 60 * 60 * 1000).toBe(RESUME_LINK_TTL_MS);
  });
});
