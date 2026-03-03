import { describe, expect, it } from "vitest";
import {
  extractPolicyCoverageAggregate,
  hasClientValue,
} from "./route-helpers";

describe("compliance packet route helpers", () => {
  it("treats explicit zero values as provided", () => {
    expect(hasClientValue("0")).toBe(true);
    expect(hasClientValue(0)).toBe(true);
    expect(hasClientValue("  ")).toBe(false);
  });

  it("keeps policy count independent from active coverage amount", () => {
    expect(
      extractPolicyCoverageAggregate({
        totalPolicyCount: 1,
        totalActivePolicyCoverage: "0",
      }),
    ).toEqual({
      totalPolicyCount: 1,
      activePolicyCoverage: 0,
    });
  });
});
