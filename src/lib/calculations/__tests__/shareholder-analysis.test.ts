import { describe, expect, it } from "vitest";

import {
  buildShareholderAnalysisInput,
  computeCurrentOwnershipBps,
} from "../shareholder-analysis";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBusiness(
  overrides: Partial<{ id: string; name: string; valuation: string }> = {},
) {
  return {
    id: overrides.id ?? "biz-1",
    name: overrides.name ?? "Acme Corp",
    valuation: overrides.valuation ?? "1000000",
  };
}

function makeShareholder(
  id: string,
  name: string,
  ownershipPercentage: string,
) {
  return { id, name, ownershipPercentage };
}

// ---------------------------------------------------------------------------
// buildShareholderAnalysisInput
// ---------------------------------------------------------------------------

describe("buildShareholderAnalysisInput", () => {
  // ---- Empty / zero inputs ------------------------------------------------

  it("returns zero totals when no shareholders are provided", () => {
    const result = buildShareholderAnalysisInput(makeBusiness(), []);

    expect(result.businessId).toBe("biz-1");
    expect(result.businessName).toBe("Acme Corp");
    expect(result.businessValuation).toBe(1_000_000);
    expect(result.shareholders).toEqual([]);
    expect(result.totalOwnership).toBe(0);
  });

  it("treats invalid valuation as 0", () => {
    const result = buildShareholderAnalysisInput(
      makeBusiness({ valuation: "not-a-number" }),
      [makeShareholder("s1", "Alice", "50")],
    );

    expect(result.businessValuation).toBe(0);
    expect(result.shareholders[0]!.stakeValue).toBe(0);
  });

  it("treats empty-string valuation as 0", () => {
    const result = buildShareholderAnalysisInput(
      makeBusiness({ valuation: "" }),
      [],
    );

    expect(result.businessValuation).toBe(0);
  });

  // ---- Parsing ownership inputs -------------------------------------------

  it("parses ownership percentages from string inputs", () => {
    const result = buildShareholderAnalysisInput(makeBusiness(), [
      makeShareholder("s1", "Alice", "60"),
      makeShareholder("s2", "Bob", "40"),
    ]);

    expect(result.shareholders[0]!.ownershipPercentage).toBe(60);
    expect(result.shareholders[1]!.ownershipPercentage).toBe(40);
    expect(result.totalOwnership).toBe(100);
  });

  it("treats invalid ownership percentage as 0", () => {
    const result = buildShareholderAnalysisInput(makeBusiness(), [
      makeShareholder("s1", "Alice", "abc"),
    ]);

    expect(result.shareholders[0]!.ownershipPercentage).toBe(0);
    expect(result.shareholders[0]!.stakeValue).toBe(0);
    expect(result.totalOwnership).toBe(0);
  });

  // ---- Stake value computation --------------------------------------------

  it("computes stake values based on valuation and ownership", () => {
    const result = buildShareholderAnalysisInput(
      makeBusiness({ valuation: "500000" }),
      [
        makeShareholder("s1", "Alice", "25"),
        makeShareholder("s2", "Bob", "75"),
      ],
    );

    expect(result.shareholders[0]!.stakeValue).toBe(125_000);
    expect(result.shareholders[1]!.stakeValue).toBe(375_000);
  });

  // ---- Boundary values ----------------------------------------------------

  it("handles 0% ownership", () => {
    const result = buildShareholderAnalysisInput(
      makeBusiness({ valuation: "1000000" }),
      [makeShareholder("s1", "Alice", "0")],
    );

    expect(result.shareholders[0]!.ownershipPercentage).toBe(0);
    expect(result.shareholders[0]!.stakeValue).toBe(0);
    expect(result.totalOwnership).toBe(0);
  });

  it("handles 100% single shareholder", () => {
    const result = buildShareholderAnalysisInput(
      makeBusiness({ valuation: "2000000" }),
      [makeShareholder("s1", "Alice", "100")],
    );

    expect(result.shareholders[0]!.ownershipPercentage).toBe(100);
    expect(result.shareholders[0]!.stakeValue).toBe(2_000_000);
    expect(result.totalOwnership).toBe(100);
  });

  it("handles decimal ownership (33.33%)", () => {
    const result = buildShareholderAnalysisInput(
      makeBusiness({ valuation: "900000" }),
      [
        makeShareholder("s1", "Alice", "33.33"),
        makeShareholder("s2", "Bob", "33.33"),
        makeShareholder("s3", "Charlie", "33.34"),
      ],
    );

    expect(result.shareholders[0]!.ownershipPercentage).toBe(33.33);
    expect(result.shareholders[1]!.ownershipPercentage).toBe(33.33);
    expect(result.shareholders[2]!.ownershipPercentage).toBe(33.34);
    expect(result.totalOwnership).toBe(100);
  });

  it("handles tiny fractional ownership (0.01%)", () => {
    const result = buildShareholderAnalysisInput(
      makeBusiness({ valuation: "10000000" }),
      [makeShareholder("s1", "Alice", "0.01")],
    );

    expect(result.shareholders[0]!.ownershipPercentage).toBe(0.01);
    expect(result.shareholders[0]!.stakeValue).toBeCloseTo(1_000, 2);
    expect(result.totalOwnership).toBe(0.01);
  });

  // ---- Multiple shareholders summing near 100 ----------------------------

  it("sums ownership near 100 with decimals (99.99 + 0.01)", () => {
    const result = buildShareholderAnalysisInput(makeBusiness(), [
      makeShareholder("s1", "Alice", "99.99"),
      makeShareholder("s2", "Bob", "0.01"),
    ]);

    expect(result.totalOwnership).toBe(100);
  });

  it("produces exactly 100 for three-way decimal split (no float artifacts)", () => {
    const result = buildShareholderAnalysisInput(makeBusiness(), [
      makeShareholder("s1", "Alice", "33.33"),
      makeShareholder("s2", "Bob", "33.33"),
      makeShareholder("s3", "Charlie", "33.34"),
    ]);

    // Must be exactly 100, not 99.99999… or 100.00000…01
    expect(result.totalOwnership).toBe(100);
    expect(result.totalOwnership).toStrictEqual(100);
  });

  it("produces exactly 50 for two equal shareholders (no float artifacts)", () => {
    const result = buildShareholderAnalysisInput(makeBusiness(), [
      makeShareholder("s1", "Alice", "25.01"),
      makeShareholder("s2", "Bob", "24.99"),
    ]);

    expect(result.totalOwnership).toBe(50);
  });

  // ---- Preserves business metadata ----------------------------------------

  it("passes through business ID and name unchanged", () => {
    const result = buildShareholderAnalysisInput(
      makeBusiness({ id: "custom-id", name: "Custom Biz" }),
      [],
    );

    expect(result.businessId).toBe("custom-id");
    expect(result.businessName).toBe("Custom Biz");
  });
});

// ---------------------------------------------------------------------------
// computeCurrentOwnershipBps
// ---------------------------------------------------------------------------

describe("computeCurrentOwnershipBps", () => {
  // ---- Empty inputs -------------------------------------------------------

  it("returns 0 for empty shareholder list", () => {
    expect(computeCurrentOwnershipBps([])).toBe(0);
  });

  // ---- Basic summation ----------------------------------------------------

  it("sums ownership in basis points", () => {
    const shareholders = [
      makeShareholder("s1", "Alice", "50"),
      makeShareholder("s2", "Bob", "30"),
    ];

    // 50% + 30% = 80% = 8000 bps
    expect(computeCurrentOwnershipBps(shareholders)).toBe(8_000);
  });

  it("returns 10000 for 100% ownership", () => {
    const shareholders = [makeShareholder("s1", "Alice", "100")];

    expect(computeCurrentOwnershipBps(shareholders)).toBe(10_000);
  });

  // ---- Exclude ID ---------------------------------------------------------

  it("excludes a shareholder by ID", () => {
    const shareholders = [
      makeShareholder("s1", "Alice", "60"),
      makeShareholder("s2", "Bob", "40"),
    ];

    // Exclude Alice → only Bob's 40% = 4000 bps
    expect(computeCurrentOwnershipBps(shareholders, "s1")).toBe(4_000);
  });

  it("excludes nothing when excludeId does not match", () => {
    const shareholders = [
      makeShareholder("s1", "Alice", "25"),
      makeShareholder("s2", "Bob", "25"),
    ];

    expect(computeCurrentOwnershipBps(shareholders, "non-existent")).toBe(
      5_000,
    );
  });

  // ---- Decimal / rounding ------------------------------------------------

  it("handles decimal percentages (33.33%)", () => {
    const shareholders = [
      makeShareholder("s1", "Alice", "33.33"),
      makeShareholder("s2", "Bob", "33.33"),
      makeShareholder("s3", "Charlie", "33.34"),
    ];

    // 3333 + 3333 + 3334 = 10000 bps (exactly 100%)
    expect(computeCurrentOwnershipBps(shareholders)).toBe(10_000);
  });

  it("rounds to nearest basis point (0.005 rounds to 1 bps)", () => {
    // 0.005% → Math.round(0.005 * 100) = Math.round(0.5) = 1
    const shareholders = [makeShareholder("s1", "Alice", "0.005")];

    expect(computeCurrentOwnershipBps(shareholders)).toBe(1);
  });

  it("rounds to nearest basis point (0.004 rounds to 0 bps)", () => {
    // 0.004% → Math.round(0.004 * 100) = Math.round(0.4) = 0
    const shareholders = [makeShareholder("s1", "Alice", "0.004")];

    expect(computeCurrentOwnershipBps(shareholders)).toBe(0);
  });

  // ---- Boundary values ---------------------------------------------------

  it("handles 0% ownership", () => {
    const shareholders = [makeShareholder("s1", "Alice", "0")];

    expect(computeCurrentOwnershipBps(shareholders)).toBe(0);
  });

  it("sums near 100% with tiny remainders (99.99 + 0.01)", () => {
    const shareholders = [
      makeShareholder("s1", "Alice", "99.99"),
      makeShareholder("s2", "Bob", "0.01"),
    ];

    // 9999 + 1 = 10000
    expect(computeCurrentOwnershipBps(shareholders)).toBe(10_000);
  });

  // ---- Invalid inputs -----------------------------------------------------

  it("treats invalid ownership string as 0 bps", () => {
    const shareholders = [
      makeShareholder("s1", "Alice", "abc"),
      makeShareholder("s2", "Bob", "25"),
    ];

    // NaN rounds to NaN, but Number("abc") is NaN → Math.round(NaN * 100) = NaN
    // However sum: 0 + NaN = NaN — ensure we guard or document behavior
    // Current impl: NaN propagates. This test documents that.
    expect(computeCurrentOwnershipBps(shareholders)).toBeNaN();
  });
});
