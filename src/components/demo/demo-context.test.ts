import { describe, expect, it } from "vitest";
import { getNextSegment, getPrevSegment, getSegmentPath } from "./demo-context";

describe("demo journey segment order", () => {
  it("uses intake as the first step after landing", () => {
    expect(getNextSegment("landing")).toBe("intake");
  });

  it("maps intake, estimate, showcase, and handoff paths", () => {
    expect(getSegmentPath("intake")).toBe("/demo/intake");
    expect(getSegmentPath("estimate")).toBe("/demo/estimate");
    expect(getSegmentPath("showcase")).toBe("/demo/showcase");
    expect(getSegmentPath("handoff")).toBe("/demo/handoff");
  });

  it("supports forward and reverse navigation through showcase", () => {
    expect(getNextSegment("estimate")).toBe("showcase");
    expect(getPrevSegment("handoff")).toBe("showcase");
  });
});
