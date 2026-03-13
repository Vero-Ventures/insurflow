import { describe, expect, it } from "vitest";
import {
  decimalString,
  isValidClientAge,
  isValidDate,
  MAX_MONEY_VALUE,
  MIN_CLIENT_AGE,
  MAX_CLIENT_AGE,
} from "../client";

describe("isValidDate", () => {
  it("accepts valid dates in YYYY-MM-DD format", () => {
    expect(isValidDate("2000-01-15")).toBe(true);
    expect(isValidDate("1990-12-31")).toBe(true);
    expect(isValidDate("2020-02-29")).toBe(true); // leap year
  });

  it("rejects invalid date structures", () => {
    expect(isValidDate("2023-02-30")).toBe(false); // Feb 30 doesn't exist
    expect(isValidDate("2023-04-31")).toBe(false); // April has 30 days
    expect(isValidDate("2023-13-01")).toBe(false); // Invalid month
    expect(isValidDate("2021-02-29")).toBe(false); // Not a leap year
  });

  it("rejects future dates", () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDateStr = futureDate.toISOString().split("T")[0];
    expect(isValidDate(futureDateStr!)).toBe(false);
  });

  it("accepts today's date", () => {
    const today = new Date().toISOString().split("T")[0];
    expect(isValidDate(today!)).toBe(true);
  });

  it("rejects malformed date strings", () => {
    expect(isValidDate("not-a-date")).toBe(false);
    expect(isValidDate("2023/01/15")).toBe(false);
    expect(isValidDate("15-01-2023")).toBe(false);
    expect(isValidDate("")).toBe(false);
  });
});

describe("isValidClientAge", () => {
  const getDateYearsAgo = (years: number): string => {
    const now = new Date();
    const year = now.getUTCFullYear() - years;
    const month = now.getUTCMonth();
    const day = now.getUTCDate();
    return new Date(Date.UTC(year, month, day)).toISOString().split("T")[0]!;
  };

  it("accepts ages within valid range (18-120)", () => {
    expect(isValidClientAge(getDateYearsAgo(18))).toBe(true);
    expect(isValidClientAge(getDateYearsAgo(30))).toBe(true);
    expect(isValidClientAge(getDateYearsAgo(65))).toBe(true);
    expect(isValidClientAge(getDateYearsAgo(120))).toBe(true);
  });

  it("rejects ages below minimum", () => {
    expect(isValidClientAge(getDateYearsAgo(17))).toBe(false);
    expect(isValidClientAge(getDateYearsAgo(10))).toBe(false);
    expect(isValidClientAge(getDateYearsAgo(0))).toBe(false);
  });

  it("rejects ages above maximum", () => {
    expect(isValidClientAge(getDateYearsAgo(121))).toBe(false);
    expect(isValidClientAge(getDateYearsAgo(150))).toBe(false);
  });

  it("handles edge case of birthday not yet occurred this year", () => {
    // Create a date that's exactly 18 years ago minus 1 day
    // This person is still 17 until tomorrow
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    date.setDate(date.getDate() + 1); // birthday is tomorrow
    const dateStr = date.toISOString().split("T")[0]!;
    expect(isValidClientAge(dateStr)).toBe(false);
  });

  it("exports correct constants", () => {
    expect(MIN_CLIENT_AGE).toBe(18);
    expect(MAX_CLIENT_AGE).toBe(120);
  });
});

describe("decimalString", () => {
  const incomeValidator = decimalString("income");

  it("accepts valid decimal strings", () => {
    expect(incomeValidator.safeParse("0").success).toBe(true);
    expect(incomeValidator.safeParse("100").success).toBe(true);
    expect(incomeValidator.safeParse("100.00").success).toBe(true);
    expect(incomeValidator.safeParse("75000.50").success).toBe(true);
    expect(incomeValidator.safeParse("999999999999.99").success).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(incomeValidator.safeParse("-100").success).toBe(false); // negative
    expect(incomeValidator.safeParse("100.001").success).toBe(false); // too many decimals
    expect(incomeValidator.safeParse("abc").success).toBe(false); // non-numeric
    expect(incomeValidator.safeParse("").success).toBe(false); // empty
    expect(incomeValidator.safeParse("100,000").success).toBe(false); // comma
    expect(incomeValidator.safeParse(".50").success).toBe(false); // no leading digit
  });

  it("rejects values exceeding max", () => {
    const result = incomeValidator.safeParse("9999999999999.99"); // exceeds max
    expect(result.success).toBe(false);
  });

  it("accepts custom max value", () => {
    const percentValidator = decimalString("percent", 100);
    expect(percentValidator.safeParse("100").success).toBe(true);
    expect(percentValidator.safeParse("100.00").success).toBe(true);

    const overMaxResult = percentValidator.safeParse("100.01");
    expect(overMaxResult.success).toBe(false);
  });

  it("exports correct max money constant", () => {
    expect(MAX_MONEY_VALUE).toBe(999_999_999_999.99);
  });
});

// ============================================================================
// decimalString — nullable() support for PATCH clearing behaviour
// ============================================================================

describe("decimalString with nullable()", () => {
  const nullableDecimal = decimalString("spouse income").nullable();

  it("accepts null to clear a previously saved value", () => {
    const result = nullableDecimal.safeParse(null);
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it("still accepts valid decimal strings", () => {
    expect(nullableDecimal.safeParse("50000").success).toBe(true);
    expect(nullableDecimal.safeParse("0").success).toBe(true);
    expect(nullableDecimal.safeParse("100.50").success).toBe(true);
  });

  it("still rejects invalid formats", () => {
    expect(nullableDecimal.safeParse("abc").success).toBe(false);
    expect(nullableDecimal.safeParse("-100").success).toBe(false);
    expect(nullableDecimal.safeParse("").success).toBe(false);
  });

  it("rejects undefined (nullable ≠ optional)", () => {
    expect(nullableDecimal.safeParse(undefined).success).toBe(false);
  });
});
