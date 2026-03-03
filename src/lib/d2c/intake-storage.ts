import type { D2cIntake } from "./intake-types";

export const D2C_INTAKE_STORAGE_KEY = "d2c_intake";

export const DEFAULT_D2C_INTAKE: D2cIntake = {
  dateOfBirth: "",
  gender: "",
  province: "",
  tobaccoUse: false,
  annualIncome: 0,
  coverageAmount: 0,
  termYears: 20,
  healthClass: "",
};

/**
 * Load D2C intake from sessionStorage.
 * Returns defaults if:
 * - Running in SSR (no window)
 * - No stored value
 * - Invalid JSON
 * - Stored value is not an object
 *
 * Merges stored values into defaults for forward-compatibility
 * when new fields are added to the schema.
 */
export function loadD2cIntake(): D2cIntake {
  if (typeof window === "undefined") {
    return DEFAULT_D2C_INTAKE;
  }

  try {
    const stored = sessionStorage.getItem(D2C_INTAKE_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_D2C_INTAKE;
    }

    const parsed: unknown = JSON.parse(stored);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return DEFAULT_D2C_INTAKE;
    }

    return { ...DEFAULT_D2C_INTAKE, ...(parsed as Partial<D2cIntake>) };
  } catch {
    return DEFAULT_D2C_INTAKE;
  }
}

/**
 * Save partial D2C intake to sessionStorage.
 * Merges with existing stored values (or defaults if none).
 * Returns the merged intake.
 *
 * Safe to call in SSR - returns merged value without side effects.
 */
export function saveD2cIntake(partial: Partial<D2cIntake>): D2cIntake {
  const current = loadD2cIntake();
  const merged: D2cIntake = { ...current, ...partial };

  if (typeof window !== "undefined") {
    sessionStorage.setItem(D2C_INTAKE_STORAGE_KEY, JSON.stringify(merged));
  }

  return merged;
}
