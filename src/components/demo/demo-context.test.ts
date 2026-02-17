import { describe, expect, it } from "vitest";
import { getNextSegment, getPrevSegment, getSegmentPath } from "./demo-context";

describe("demo journey segment order", () => {
  it("uses intake as the first step after landing", () => {
    expect(getNextSegment("landing")).toBe("intake");
  });

  it("maps intake, estimate, and handoff paths", () => {
    expect(getSegmentPath("intake")).toBe("/demo/intake");
    expect(getSegmentPath("estimate")).toBe("/demo/estimate");
    expect(getSegmentPath("handoff")).toBe("/demo/handoff");
  });

  it("supports reverse navigation from handoff", () => {
    expect(getPrevSegment("handoff")).toBe("estimate");
  });
});
