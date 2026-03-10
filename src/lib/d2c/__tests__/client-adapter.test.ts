/**
 * @fileoverview Unit tests for D2cIntake <-> Client adapter functions.
 */

import { describe, expect, it } from "vitest";

import {
  genderToSex,
  sexToGender,
  healthClassToRating,
  healthRatingToClass,
  numberToDecimalString,
  decimalStringToNumber,
  d2cIntakeToClientFields,
  clientFieldsToD2cIntake,
  getDraftCompleteness,
  type ClientDraftFields,
} from "../client-adapter";
import { DEFAULT_D2C_INTAKE } from "../intake-storage";
import type { D2cIntake } from "../intake-types";

// ============================================================================
// Gender <-> Sex mapping
// ============================================================================

describe("genderToSex", () => {
  it("maps 'male' to 'M'", () => {
    expect(genderToSex("male")).toBe("M");
  });

  it("maps 'female' to 'F'", () => {
    expect(genderToSex("female")).toBe("F");
  });

  it("returns 'M' as default for empty string", () => {
    expect(genderToSex("")).toBe("M");
  });
});

describe("sexToGender", () => {
  it("maps 'M' to 'male'", () => {
    expect(sexToGender("M")).toBe("male");
  });

  it("maps 'F' to 'female'", () => {
    expect(sexToGender("F")).toBe("female");
  });

  it("returns empty string for null", () => {
    expect(sexToGender(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(sexToGender(undefined)).toBe("");
  });

  it("returns empty string for unrecognized value", () => {
    expect(sexToGender("X")).toBe("");
  });
});

// ============================================================================
// HealthClass <-> HealthRating mapping
// ============================================================================

describe("healthClassToRating", () => {
  it("maps D2C health classes to DB ratings (identity mapping)", () => {
    expect(healthClassToRating("preferred_plus")).toBe("preferred_plus");
    expect(healthClassToRating("preferred")).toBe("preferred");
    expect(healthClassToRating("standard_plus")).toBe("standard_plus");
    expect(healthClassToRating("standard")).toBe("standard");
  });

  it("returns 'standard' for empty string", () => {
    expect(healthClassToRating("")).toBe("standard");
  });
});

describe("healthRatingToClass", () => {
  it("maps shared DB ratings back to D2C health classes", () => {
    expect(healthRatingToClass("preferred_plus")).toBe("preferred_plus");
    expect(healthRatingToClass("preferred")).toBe("preferred");
    expect(healthRatingToClass("standard_plus")).toBe("standard_plus");
    expect(healthRatingToClass("standard")).toBe("standard");
  });

  it("falls back to 'standard' for 'substandard' (no D2C equivalent)", () => {
    expect(healthRatingToClass("substandard")).toBe("standard");
  });

  it("returns empty string for null", () => {
    expect(healthRatingToClass(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(healthRatingToClass(undefined)).toBe("");
  });
});

// ============================================================================
// Numeric <-> Decimal string conversion
// ============================================================================

describe("numberToDecimalString", () => {
  it("converts positive numbers to decimal strings", () => {
    expect(numberToDecimalString(75000)).toBe("75000.00");
    expect(numberToDecimalString(500000.5)).toBe("500000.50");
  });

  it("returns '0' for zero", () => {
    expect(numberToDecimalString(0)).toBe("0");
  });

  it("returns '0' for NaN", () => {
    expect(numberToDecimalString(NaN)).toBe("0");
  });

  it("returns '0' for negative numbers", () => {
    expect(numberToDecimalString(-100)).toBe("0");
  });
});

describe("decimalStringToNumber", () => {
  it("converts decimal strings to numbers", () => {
    expect(decimalStringToNumber("75000.00")).toBe(75000);
    expect(decimalStringToNumber("500000.50")).toBe(500000.5);
  });

  it("returns 0 for null", () => {
    expect(decimalStringToNumber(null)).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(decimalStringToNumber(undefined)).toBe(0);
  });

  it("returns 0 for empty string", () => {
    expect(decimalStringToNumber("")).toBe(0);
  });

  it("returns 0 for non-numeric string", () => {
    expect(decimalStringToNumber("not-a-number")).toBe(0);
  });
});

// ============================================================================
// D2cIntake -> Client
// ============================================================================

describe("d2cIntakeToClientFields", () => {
  const fullIntake: D2cIntake = {
    dateOfBirth: "1990-01-15",
    gender: "female",
    province: "ON",
    tobaccoUse: true,
    annualIncome: 85000,
    coverageAmount: 500000,
    termYears: 20,
    healthClass: "preferred",
    hasSpouse: true,
    spouseAge: 39,
    youngestChildAge: 8,
    additionalGoals: "Keep mortgage protection in place",
  };

  it("maps all populated fields correctly", () => {
    const result = d2cIntakeToClientFields(fullIntake);

    expect(result.dateOfBirth).toBe("1990-01-15");
    expect(result.sex).toBe("F");
    expect(result.province).toBe("ON");
    expect(result.smoker).toBe(true);
    expect(result.clientIncome).toBe("85000.00");
    expect(result.existingLifeInsuranceCoverage).toBe("500000.00");
    expect(result.replacementDurationYears).toBe(20);
    expect(result.healthRating).toBe("preferred");
    expect(result.hasSpouse).toBe(true);
    expect(result.spouseAge).toBe(39);
    expect(result.youngestChildAge).toBe(8);
    expect(result.additionalGoals).toBe("Keep mortgage protection in place");
  });

  it("maps empty/zero values to draft defaults", () => {
    const result = d2cIntakeToClientFields(DEFAULT_D2C_INTAKE);

    expect(result.dateOfBirth).toBe("2000-01-01");
    expect(result.sex).toBe("M");
    expect(result.province).toBe("NY");
    expect(result.healthRating).toBe("standard");
    expect(result.clientIncome).toBe("0");
    expect(result.existingLifeInsuranceCoverage).toBe("0");
    expect(result.smoker).toBe(false);
    expect(result.replacementDurationYears).toBe(20);
  });

  it("only includes fields explicitly provided", () => {
    const result = d2cIntakeToClientFields({ annualIncome: 75000 });

    expect(result.clientIncome).toBe("75000.00");
    expect(result.dateOfBirth).toBeUndefined();
    expect(result.province).toBeUndefined();
    expect(result.sex).toBeUndefined();
  });

  it("forces spouseAge to null when hasSpouse is false", () => {
    const result = d2cIntakeToClientFields({ hasSpouse: false, spouseAge: 41 });

    expect(result.hasSpouse).toBe(false);
    expect(result.spouseAge).toBeNull();
  });

  it("handles partial intake (only province and income)", () => {
    const partial: D2cIntake = {
      ...DEFAULT_D2C_INTAKE,
      province: "BC",
      annualIncome: 60000,
    };

    const result = d2cIntakeToClientFields(partial);

    expect(result.province).toBe("BC");
    expect(result.clientIncome).toBe("60000.00");
    expect(result.dateOfBirth).toBe("2000-01-01");
  });
});

// ============================================================================
// Client -> D2cIntake
// ============================================================================

describe("clientFieldsToD2cIntake", () => {
  const fullClient: ClientDraftFields = {
    firstName: "Jane",
    lastName: "Doe",
    dateOfBirth: "1990-01-15",
    sex: "F",
    province: "ON",
    smoker: true,
    healthRating: "preferred",
    clientIncome: "85000.00",
    existingLifeInsuranceCoverage: "500000.00",
    replacementDurationYears: 20,
    hasSpouse: true,
    spouseAge: 41,
    youngestChildAge: 10,
    additionalGoals: "Plan for education costs",
    status: "draft",
  };

  it("maps all fields correctly", () => {
    const result = clientFieldsToD2cIntake(fullClient);

    expect(result.dateOfBirth).toBe("1990-01-15");
    expect(result.gender).toBe("female");
    expect(result.province).toBe("ON");
    expect(result.tobaccoUse).toBe(true);
    expect(result.annualIncome).toBe(85000);
    expect(result.coverageAmount).toBe(500000);
    expect(result.termYears).toBe(20);
    expect(result.healthClass).toBe("preferred");
    expect(result.hasSpouse).toBe(true);
    expect(result.spouseAge).toBe(41);
    expect(result.youngestChildAge).toBe(10);
    expect(result.additionalGoals).toBe("Plan for education costs");
  });

  it("handles 'substandard' health rating gracefully", () => {
    const client: ClientDraftFields = {
      ...fullClient,
      healthRating: "substandard",
    };

    const result = clientFieldsToD2cIntake(client);

    expect(result.healthClass).toBe("standard");
  });

  it("handles male sex mapping", () => {
    const client: ClientDraftFields = { ...fullClient, sex: "M" };

    const result = clientFieldsToD2cIntake(client);

    expect(result.gender).toBe("male");
  });
});

// ============================================================================
// Round-trip integrity
// ============================================================================

describe("round-trip: D2cIntake -> Client -> D2cIntake", () => {
  it("preserves all field values through the round-trip", () => {
    const original: D2cIntake = {
      dateOfBirth: "1988-06-15",
      gender: "male",
      province: "AB",
      tobaccoUse: false,
      annualIncome: 120000,
      coverageAmount: 750000,
      termYears: 30,
      healthClass: "standard_plus",
      hasSpouse: true,
      spouseAge: 37,
      youngestChildAge: 5,
      additionalGoals: "Bridge mortgage and tuition",
    };

    const clientFields = d2cIntakeToClientFields(original);

    // Simulate a full client record with the adapted fields
    const fullClient: ClientDraftFields = {
      firstName: "Draft",
      lastName: "User",
      dateOfBirth: clientFields.dateOfBirth ?? "",
      sex: clientFields.sex ?? "M",
      province: clientFields.province ?? "",
      smoker: clientFields.smoker ?? false,
      healthRating: clientFields.healthRating ?? "standard",
      clientIncome: clientFields.clientIncome ?? "0",
      existingLifeInsuranceCoverage:
        clientFields.existingLifeInsuranceCoverage ?? "0",
      replacementDurationYears: clientFields.replacementDurationYears ?? 20,
      hasSpouse: clientFields.hasSpouse ?? false,
      spouseAge: clientFields.spouseAge ?? null,
      youngestChildAge: clientFields.youngestChildAge ?? null,
      additionalGoals: clientFields.additionalGoals ?? "",
      status: "draft",
    };

    const restored = clientFieldsToD2cIntake(fullClient);

    expect(restored.dateOfBirth).toBe(original.dateOfBirth);
    expect(restored.gender).toBe(original.gender);
    expect(restored.province).toBe(original.province);
    expect(restored.tobaccoUse).toBe(original.tobaccoUse);
    expect(restored.annualIncome).toBe(original.annualIncome);
    expect(restored.coverageAmount).toBe(original.coverageAmount);
    expect(restored.termYears).toBe(original.termYears);
    expect(restored.healthClass).toBe(original.healthClass);
    expect(restored.hasSpouse).toBe(original.hasSpouse);
    expect(restored.spouseAge).toBe(original.spouseAge);
    expect(restored.youngestChildAge).toBe(original.youngestChildAge);
    expect(restored.additionalGoals).toBe(original.additionalGoals);
  });
});

// ============================================================================
// Draft completeness
// ============================================================================

describe("getDraftCompleteness", () => {
  it("returns 0 for a fully empty intake", () => {
    const result = getDraftCompleteness(DEFAULT_D2C_INTAKE);

    expect(result).toBe(0);
  });

  it("returns 1 for a fully complete intake", () => {
    const complete: D2cIntake = {
      dateOfBirth: "1990-01-15",
      gender: "female",
      province: "ON",
      tobaccoUse: false,
      annualIncome: 85000,
      coverageAmount: 500000,
      termYears: 20,
      healthClass: "preferred",
      hasSpouse: false,
      spouseAge: null,
      youngestChildAge: null,
      additionalGoals: "",
    };

    const result = getDraftCompleteness(complete);

    expect(result).toBe(1);
  });

  it("weights required fields more heavily than optional", () => {
    const requiredOnly: D2cIntake = {
      ...DEFAULT_D2C_INTAKE,
      province: "ON",
      dateOfBirth: "1990-01-15",
      annualIncome: 85000,
    };

    const result = getDraftCompleteness(requiredOnly);

    // All required fields (70% weight) filled, no optional (30% weight)
    expect(result).toBeCloseTo(0.7, 2);
  });

  it("returns partial progress for some required fields", () => {
    const partial: D2cIntake = {
      ...DEFAULT_D2C_INTAKE,
      province: "ON",
    };

    const result = getDraftCompleteness(partial);

    // 1/3 required fields = ~0.233 * 0.7 weight
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(0.5);
  });
});
