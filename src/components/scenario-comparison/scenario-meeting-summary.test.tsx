import { describe, expect, it } from "vitest";
import { getTargetCoverageFromSortedTotals } from "./scenario-meeting-summary";

describe("getTargetCoverageFromSortedTotals", () => {
  it("returns the average of the two middle values for even scenarios", () => {
    expect(getTargetCoverageFromSortedTotals([100_000, 300_000])).toBe(200_000);
  });
});
