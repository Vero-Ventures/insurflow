import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  D2C_INTAKE_STORAGE_KEY,
  DEFAULT_D2C_INTAKE,
  loadD2cIntake,
  saveD2cIntake,
} from "../intake-storage";
import type { D2cIntake } from "../intake-types";

describe("D2C intake storage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe("loadD2cIntake", () => {
    it("returns defaults when sessionStorage is empty", () => {
      const result = loadD2cIntake();

      expect(result).toEqual(DEFAULT_D2C_INTAKE);
    });

    it("returns defaults when stored value is invalid JSON", () => {
      sessionStorage.setItem(D2C_INTAKE_STORAGE_KEY, "not-valid-json");

      const result = loadD2cIntake();

      expect(result).toEqual(DEFAULT_D2C_INTAKE);
    });

    it("returns defaults when stored value is not an object", () => {
      sessionStorage.setItem(D2C_INTAKE_STORAGE_KEY, '"just-a-string"');

      const result = loadD2cIntake();

      expect(result).toEqual(DEFAULT_D2C_INTAKE);
    });

    it("returns stored intake when valid", () => {
      const stored: D2cIntake = {
        ...DEFAULT_D2C_INTAKE,
        dateOfBirth: "1990-01-15",
        annualIncome: 75000,
      };
      sessionStorage.setItem(D2C_INTAKE_STORAGE_KEY, JSON.stringify(stored));

      const result = loadD2cIntake();

      expect(result).toEqual(stored);
    });
  });

  describe("saveD2cIntake", () => {
    it("saves partial intake merged with defaults", () => {
      saveD2cIntake({ dateOfBirth: "1985-06-20" });

      const stored = JSON.parse(
        sessionStorage.getItem(D2C_INTAKE_STORAGE_KEY) ?? "{}",
      );
      expect(stored.dateOfBirth).toBe("1985-06-20");
      // Other fields should be default
      expect(stored.annualIncome).toBe(DEFAULT_D2C_INTAKE.annualIncome);
    });

    it("merges with existing stored values", () => {
      // First save
      saveD2cIntake({ dateOfBirth: "1985-06-20", annualIncome: 100000 });

      // Second save (partial update)
      saveD2cIntake({ state: "CA" });

      const result = loadD2cIntake();

      expect(result.dateOfBirth).toBe("1985-06-20");
      expect(result.annualIncome).toBe(100000);
      expect(result.state).toBe("CA");
    });

    it("returns the merged intake", () => {
      const result = saveD2cIntake({ dateOfBirth: "1992-03-10" });

      expect(result.dateOfBirth).toBe("1992-03-10");
      expect(result.annualIncome).toBe(DEFAULT_D2C_INTAKE.annualIncome);
    });
  });

  describe("round-trip", () => {
    it("preserves all fields through save and load cycle", () => {
      const intake: D2cIntake = {
        dateOfBirth: "1988-12-25",
        gender: "female",
        state: "NY",
        tobaccoUse: true,
        annualIncome: 150000,
        coverageAmount: 500000,
        termYears: 20,
        healthClass: "standard",
      };

      saveD2cIntake(intake);
      const loaded = loadD2cIntake();

      expect(loaded).toEqual(intake);
    });
  });

  describe("SSR safety", () => {
    it("loadD2cIntake returns defaults when window is undefined", () => {
      const originalWindow = global.window;
      // @ts-expect-error - simulating SSR
      delete global.window;

      const result = loadD2cIntake();

      expect(result).toEqual(DEFAULT_D2C_INTAKE);

      global.window = originalWindow;
    });

    it("saveD2cIntake returns defaults without throwing when window is undefined", () => {
      const originalWindow = global.window;
      // @ts-expect-error - simulating SSR
      delete global.window;

      const result = saveD2cIntake({ dateOfBirth: "1990-01-01" });

      expect(result).toEqual({
        ...DEFAULT_D2C_INTAKE,
        dateOfBirth: "1990-01-01",
      });

      global.window = originalWindow;
    });
  });
});
