import { describe, it, expect } from "vitest";
import {
  getMethodologyData,
  getAvailableMethodologies,
  INSURANCE_NEEDS_METHODOLOGY,
  INCOME_REPLACEMENT_METHODOLOGY,
} from "../methodology-data";

describe("getMethodologyData", () => {
  it("returns insurance needs methodology", () => {
    const data = getMethodologyData("insurance-needs");
    expect(data).toBeDefined();
    expect(data?.id).toBe("insurance-needs");
    expect(data?.title).toBe("Insurance Needs Analysis");
  });

  it("returns income replacement methodology", () => {
    const data = getMethodologyData("income-replacement");
    expect(data).toBeDefined();
    expect(data?.id).toBe("income-replacement");
  });

  it("returns undefined for unknown module", () => {
    expect(getMethodologyData("unknown")).toBeUndefined();
  });
});

describe("getAvailableMethodologies", () => {
  it("returns all methodology IDs", () => {
    const ids = getAvailableMethodologies();
    expect(ids).toContain("insurance-needs");
    expect(ids).toContain("income-replacement");
    expect(ids).toHaveLength(2);
  });
});

describe("methodology data structure", () => {
  const allMethodologies = [
    INSURANCE_NEEDS_METHODOLOGY,
    INCOME_REPLACEMENT_METHODOLOGY,
  ];

  it.each(allMethodologies)("$id has required fields", (methodology) => {
    expect(methodology.id).toBeTruthy();
    expect(methodology.title).toBeTruthy();
    expect(methodology.summary).toBeTruthy();
    expect(methodology.steps.length).toBeGreaterThan(0);
    expect(methodology.sources.length).toBeGreaterThan(0);
    expect(methodology.assumptions.length).toBeGreaterThan(0);
    expect(methodology.lastReviewedDate).toBeTruthy();
  });

  it.each(allMethodologies)(
    "$id has sequentially numbered steps",
    (methodology) => {
      methodology.steps.forEach((step, i) => {
        expect(step.step).toBe(i + 1);
        expect(step.title).toBeTruthy();
        expect(step.description).toBeTruthy();
      });
    },
  );

  it.each(allMethodologies)("$id has valid source URLs", (methodology) => {
    methodology.sources.forEach((source) => {
      expect(source.label).toBeTruthy();
      expect(source.title).toBeTruthy();
      expect(source.url).toMatch(/^https?:\/\//);
      expect(source.accessedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(source.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
