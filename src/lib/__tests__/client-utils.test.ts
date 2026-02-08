import { describe, expect, it } from "vitest";

import {
  isProfileComplete,
  isFinancialInputsComplete,
  isInsuranceNeedsComplete,
  calculateCompletionStatus,
  getCompletionCount,
} from "../client-utils";

describe("Completion Status Functions", () => {
  describe("isProfileComplete", () => {
    it("returns true when all profile fields are filled", () => {
      const client = {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "1980-01-01",
        state: "NY",
      };
      expect(isProfileComplete(client)).toBe(true);
    });

    it("returns false when firstName is missing", () => {
      const client = {
        firstName: "",
        lastName: "Doe",
        dateOfBirth: "1980-01-01",
        state: "NY",
      };
      expect(isProfileComplete(client)).toBe(false);
    });

    it("returns false when lastName is missing", () => {
      const client = {
        firstName: "John",
        lastName: "",
        dateOfBirth: "1980-01-01",
        state: "NY",
      };
      expect(isProfileComplete(client)).toBe(false);
    });

    it("returns false when dateOfBirth is missing", () => {
      const client = {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "",
        state: "NY",
      };
      expect(isProfileComplete(client)).toBe(false);
    });

    it("returns false when state is missing", () => {
      const client = {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "1980-01-01",
        state: "",
      };
      expect(isProfileComplete(client)).toBe(false);
    });
  });

  describe("isFinancialInputsComplete", () => {
    it("returns true when income is greater than 0", () => {
      expect(isFinancialInputsComplete({ clientIncome: "50000.00" })).toBe(
        true,
      );
    });

    it("returns false when income is 0", () => {
      expect(isFinancialInputsComplete({ clientIncome: "0" })).toBe(false);
    });

    it("returns false when income is undefined", () => {
      expect(isFinancialInputsComplete({})).toBe(false);
    });

    it("returns false when income is empty string", () => {
      expect(isFinancialInputsComplete({ clientIncome: "" })).toBe(false);
    });

    it("returns false when income is invalid", () => {
      expect(isFinancialInputsComplete({ clientIncome: "invalid" })).toBe(
        false,
      );
    });
  });

  describe("isInsuranceNeedsComplete", () => {
    it("returns true when insurance result exists", () => {
      expect(isInsuranceNeedsComplete({ totalInsuranceNeeds: 500000 })).toBe(
        true,
      );
    });

    it("returns true when insurance result exists with 0 needs", () => {
      expect(isInsuranceNeedsComplete({ totalInsuranceNeeds: 0 })).toBe(true);
    });

    it("returns false when insurance result is null", () => {
      expect(isInsuranceNeedsComplete(null)).toBe(false);
    });
  });

  describe("calculateCompletionStatus", () => {
    it("returns all true for complete client with insurance result", () => {
      const client = {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "1980-01-01",
        state: "NY",
        clientIncome: "100000.00",
      };
      const insuranceResult = { totalInsuranceNeeds: 500000 };

      const status = calculateCompletionStatus(client, insuranceResult);

      expect(status).toEqual({
        profile: true,
        financialInputs: true,
        insuranceNeeds: true,
      });
    });

    it("returns mixed status for partially complete client", () => {
      const client = {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "1980-01-01",
        state: "NY",
        clientIncome: "0", // Not complete
      };

      const status = calculateCompletionStatus(client, null); // No insurance result

      expect(status).toEqual({
        profile: true,
        financialInputs: false,
        insuranceNeeds: false,
      });
    });
  });

  describe("getCompletionCount", () => {
    it("returns 3/3 for fully complete status", () => {
      const status = {
        profile: true,
        financialInputs: true,
        insuranceNeeds: true,
      };

      expect(getCompletionCount(status)).toEqual({ completed: 3, total: 3 });
    });

    it("returns 0/3 for empty status", () => {
      const status = {
        profile: false,
        financialInputs: false,
        insuranceNeeds: false,
      };

      expect(getCompletionCount(status)).toEqual({ completed: 0, total: 3 });
    });

    it("returns 2/3 for partially complete status", () => {
      const status = {
        profile: true,
        financialInputs: true,
        insuranceNeeds: false,
      };

      expect(getCompletionCount(status)).toEqual({ completed: 2, total: 3 });
    });
  });
});
