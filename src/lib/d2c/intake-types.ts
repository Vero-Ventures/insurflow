/**
 * D2C (Direct-to-Consumer) intake form data model.
 * Captures user information during the self-service quote funnel.
 */

export type HealthClass =
  | "preferred_plus"
  | "preferred"
  | "standard_plus"
  | "standard";

export type Gender = "male" | "female";

/**
 * D2C intake form state.
 * All fields are optional during funnel progression,
 * but will be validated before quote generation.
 */
export interface D2cIntake {
  /** ISO date string (YYYY-MM-DD) */
  dateOfBirth: string;
  gender: Gender | "";
  /** US state abbreviation */
  state: string;
  tobaccoUse: boolean;
  /** Annual income in dollars */
  annualIncome: number;
  /** Requested coverage amount in dollars */
  coverageAmount: number;
  /** Term length in years */
  termYears: number;
  healthClass: HealthClass | "";
}
