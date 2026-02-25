import { describe, expect, it } from "vitest";
import { demoEstimateTourSteps } from "@/components/demo/tour-steps";

describe("demoEstimateTourSteps", () => {
  it("includes a transparency step on estimate page", () => {
    expect(
      demoEstimateTourSteps.some(
        (step) => step.target === "[data-tour='estimate-transparency']",
      ),
    ).toBe(true);
  });
});
