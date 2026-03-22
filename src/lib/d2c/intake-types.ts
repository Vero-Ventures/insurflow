/**
 * D2C (Direct-to-Consumer) intake form data model.
 * Captures user information during the self-service application funnel.
 */

import type { CanadianProvince } from "@/lib/constants";

export type HealthClass =
  | "preferred_plus"
  | "preferred"
  | "standard_plus"
  | "standard";

export type Gender = "male" | "female";

/**
 * D2C intake form state.
 * All fields are optional during funnel progression,
 * but will be validated before estimate generation.
 */
export interface D2cIntake {
  /** ISO date string (YYYY-MM-DD) */
  dateOfBirth: string;
  gender: Gender | "";
  /** Canadian province or territory */
  province: CanadianProvince | "";
  tobaccoUse: boolean;
  /** Annual income in dollars */
  annualIncome: number;
  /** Requested coverage amount in dollars */
  coverageAmount: number;
  /** Term length in years */
  termYears: number;
  healthClass: HealthClass | "";
  hasSpouse: boolean;
  spouseAge: number | null;
  youngestChildAge: number | null;
  additionalGoals: string;
}
