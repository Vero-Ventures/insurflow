import { describe, expect, it } from "vitest";

import {
  getAgeFromDateOfBirth,
  normalizeHealthClass,
  normalizeLifeExpectancySex,
} from "@/lib/financial/life-expectancy-profile";

describe("life-expectancy-profile helpers", () => {
  it("normalizes known health classes", () => {
    expect(normalizeHealthClass("preferred_plus")).toBe("preferred_plus");
    expect(normalizeHealthClass("standard")).toBe("standard");
  });

  it("falls back to standard for unknown health class", () => {
    expect(normalizeHealthClass("unknown")).toBe("standard");
    expect(normalizeHealthClass(undefined)).toBe("standard");
  });

  it("normalizes sex/gender inputs and defaults unknown values", () => {
    expect(normalizeLifeExpectancySex("F")).toBe("F");
    expect(normalizeLifeExpectancySex("female")).toBe("F");
    expect(normalizeLifeExpectancySex("M")).toBe("M");
    expect(normalizeLifeExpectancySex("male")).toBe("M");
    expect(normalizeLifeExpectancySex("")).toBe("M");
    expect(normalizeLifeExpectancySex("other")).toBe("M");
  });

  it("returns zero age for invalid or empty date of birth", () => {
    expect(getAgeFromDateOfBirth("")).toBe(0);
    expect(getAgeFromDateOfBirth("invalid-date")).toBe(0);
  });
});
