import { describe, it, expect } from "vitest";
import { decimalToNumber } from "../decimal-to-number";
import { buildDurationScenario } from "../income-replacement-helpers";

// ============================================================================
// decimalToNumber
// ============================================================================

describe("decimalToNumber", () => {
  describe("valid numeric strings", () => {
    it("parses a positive integer string", () => {
      expect(decimalToNumber("100")).toBe(100);
    });

    it("parses a positive decimal string", () => {
      expect(decimalToNumber("24000.50")).toBe(24000.5);
    });

    it("parses zero", () => {
      expect(decimalToNumber("0")).toBe(0);
      expect(decimalToNumber("0.00")).toBe(0);
    });

    it("parses a negative number string", () => {
      expect(decimalToNumber("-500.25")).toBe(-500.25);
    });

    it("parses very large decimal strings", () => {
      expect(decimalToNumber("99999999.99")).toBe(99999999.99);
    });

    it("parses a string with leading zeros", () => {
      expect(decimalToNumber("007.50")).toBe(7.5);
    });

    it("parses scientific notation strings", () => {
      expect(decimalToNumber("1e3")).toBe(1000);
    });
  });

  describe("null / undefined / empty fallback", () => {
    it("returns 0 for null", () => {
      expect(decimalToNumber(null)).toBe(0);
    });

    it("returns 0 for undefined", () => {
      expect(decimalToNumber(undefined)).toBe(0);
    });

    it("returns 0 for empty string", () => {
      expect(decimalToNumber("")).toBe(0);
    });

    it("returns 0 for non-numeric string", () => {
      expect(decimalToNumber("not-a-number")).toBe(0);
    });

    it("returns 0 for whitespace-only string", () => {
      expect(decimalToNumber("   ")).toBe(0);
    });
  });

  describe("Drizzle-realistic values", () => {
    it("handles typical Drizzle decimal column output", () => {
      // Drizzle returns numeric/decimal columns as strings
      expect(decimalToNumber("24000.00")).toBe(24000);
      expect(decimalToNumber("8000.00")).toBe(8000);
      expect(decimalToNumber("150000.00")).toBe(150000);
    });
  });
});

// ============================================================================
// buildDurationScenario
// ============================================================================

describe("buildDurationScenario", () => {
  describe("custom scenario (default)", () => {
    it("returns custom scenario with explicit years", () => {
      const result = buildDurationScenario("custom", 20, 40, null, null, 10);
      expect(result).toEqual({ type: "custom", years: 20 });
    });

    it("falls back to client replacementDurationYears when customYears is undefined", () => {
      const result = buildDurationScenario(
        "custom",
        undefined,
        40,
        null,
        null,
        15,
      );
      expect(result).toEqual({ type: "custom", years: 15 });
    });

    it("defaults to custom when scenarioType is undefined", () => {
      const result = buildDurationScenario(
        undefined,
        undefined,
        40,
        null,
        null,
        10,
      );
      expect(result).toEqual({ type: "custom", years: 10 });
    });

    it("defaults to custom for unrecognized scenario types", () => {
      const result = buildDurationScenario(
        "unknown-type",
        undefined,
        40,
        null,
        null,
        10,
      );
      expect(result).toEqual({ type: "custom", years: 10 });
    });

    it("prefers customYears over clientReplacementDurationYears", () => {
      const result = buildDurationScenario("custom", 25, 40, null, null, 10);
      expect(result).toEqual({ type: "custom", years: 25 });
    });
  });

  describe("childTurns18 scenario", () => {
    it("uses clientYoungestChildAge when present", () => {
      const result = buildDurationScenario(
        "childTurns18",
        undefined,
        40,
        null,
        5,
        10,
      );
      expect(result).toEqual({ type: "childTurns18", youngestChildAge: 5 });
    });

    it("falls back to 0 when clientYoungestChildAge is null", () => {
      const result = buildDurationScenario(
        "childTurns18",
        undefined,
        40,
        null,
        null,
        10,
      );
      expect(result).toEqual({ type: "childTurns18", youngestChildAge: 0 });
    });

    it("ignores customYears parameter", () => {
      const result = buildDurationScenario("childTurns18", 99, 40, null, 8, 10);
      expect(result).toEqual({ type: "childTurns18", youngestChildAge: 8 });
    });
  });

  describe("retirement scenario", () => {
    it("uses clientRetirementAge when present", () => {
      const result = buildDurationScenario(
        "retirement",
        undefined,
        45,
        60,
        null,
        10,
      );
      expect(result).toEqual({
        type: "retirement",
        currentAge: 45,
        retirementAge: 60,
      });
    });

    it("falls back to 65 when clientRetirementAge is null", () => {
      const result = buildDurationScenario(
        "retirement",
        undefined,
        50,
        null,
        null,
        10,
      );
      expect(result).toEqual({
        type: "retirement",
        currentAge: 50,
        retirementAge: 65,
      });
    });

    it("passes through currentAge directly", () => {
      const result = buildDurationScenario(
        "retirement",
        undefined,
        30,
        67,
        null,
        10,
      );
      expect(result.type).toBe("retirement");
      if (result.type === "retirement") {
        expect(result.currentAge).toBe(30);
        expect(result.retirementAge).toBe(67);
      }
    });
  });

  describe("lifetime scenario", () => {
    it("returns lifetime scenario with currentAge", () => {
      const result = buildDurationScenario(
        "lifetime",
        undefined,
        40,
        null,
        null,
        10,
      );
      expect(result).toEqual({ type: "lifetime", currentAge: 40 });
    });

    it("ignores all other parameters", () => {
      const result = buildDurationScenario("lifetime", 99, 55, 65, 8, 10);
      expect(result).toEqual({ type: "lifetime", currentAge: 55 });
    });
  });
});
