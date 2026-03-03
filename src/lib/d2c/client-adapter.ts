/**
 * @fileoverview Adapter functions for bidirectional mapping between
 * D2cIntake (frontend form state) and the Client DB schema.
 *
 * The D2C intake form uses a simplified data model (`D2cIntake`) optimized
 * for the consumer funnel. The database `client` table uses a richer schema
 * with different field names. This module bridges the two.
 *
 * Mapping rules:
 * - province (CanadianProvince) <-> province in ClientDraftFields
 *   (Note: DB column is still named `state` but handled in d2c-draft-helpers.ts)
 * - gender ("male"|"female") <-> sex ("M"|"F")
 * - healthClass (HealthClass) <-> healthRating (healthRatingEnum)
 * - tobaccoUse (boolean) <-> smoker (boolean)
 * - annualIncome (number) <-> clientIncome (decimal string)
 * - coverageAmount (number) <-> existingLifeInsuranceCoverage (decimal string)
 * - termYears (number) <-> replacementDurationYears (integer)
 * - dateOfBirth (string) <-> dateOfBirth (string) — same format
 */

import type { D2cIntake, Gender, HealthClass } from "./intake-types";

/**
 * Subset of the Client DB record used by the adapter.
 * Avoids importing the full Drizzle-inferred type to keep this module
 * independent of server-side code.
 *
 * Note: Uses `province` semantically (Canada-only app), though the
 * underlying DB column is named `state`.
 */
export interface ClientDraftFields {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: "M" | "F";
  province: string;
  smoker: boolean;
  healthRating: string;
  clientIncome: string;
  existingLifeInsuranceCoverage: string;
  replacementDurationYears: number;
  status: "draft" | "active" | "archived";
}

// ============================================================================
// Gender <-> Sex mapping
// ============================================================================

const GENDER_TO_SEX: Record<Gender, "M" | "F"> = {
  male: "M",
  female: "F",
};

const SEX_TO_GENDER: Record<string, Gender> = {
  M: "male",
  F: "female",
};

/**
 * Maps D2C gender to DB sex enum.
 * Returns "M" as default when gender is unset.
 */
export function genderToSex(gender: Gender | ""): "M" | "F" {
  if (!gender) return "M";
  return GENDER_TO_SEX[gender] ?? "M";
}

/**
 * Maps DB sex enum to D2C gender.
 * Returns "" when sex is unrecognized.
 */
export function sexToGender(sex: string | null | undefined): Gender | "" {
  if (!sex) return "";
  return SEX_TO_GENDER[sex] ?? "";
}

// ============================================================================
// HealthClass <-> HealthRating mapping
// ============================================================================

/**
 * D2C HealthClass values map directly to the DB healthRating enum
 * (minus "substandard" which is not available in D2C intake).
 * The mapping is identity for the shared values.
 */
export function healthClassToRating(healthClass: HealthClass | ""): string {
  if (!healthClass) return "standard";
  return healthClass;
}

/**
 * Maps DB healthRating to D2C HealthClass.
 * "substandard" has no D2C equivalent; falls back to "standard".
 */
export function healthRatingToClass(
  rating: string | null | undefined,
): HealthClass | "" {
  if (!rating) return "";
  const valid: HealthClass[] = [
    "preferred_plus",
    "preferred",
    "standard_plus",
    "standard",
  ];
  if (valid.includes(rating as HealthClass)) return rating as HealthClass;
  return "standard";
}

// ============================================================================
// Numeric <-> Decimal string conversion
// ============================================================================

/**
 * Converts a number to a PostgreSQL-safe decimal string.
 * Returns "0" for NaN, negative, or zero values.
 */
export function numberToDecimalString(value: number): string {
  if (!value || value < 0 || Number.isNaN(value)) return "0";
  return value.toFixed(2);
}

/**
 * Converts a decimal string to a number.
 * Returns 0 for empty/null/NaN values.
 */
export function decimalStringToNumber(
  value: string | null | undefined,
): number {
  if (!value) return 0;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

// ============================================================================
// D2cIntake -> Client (for saving to DB)
// ============================================================================

/**
 * Converts D2C intake form state to a partial Client record suitable
 * for database insertion or update.
 *
 * Missing/empty fields are included with sensible defaults so the draft
 * can be created immediately on intake page load.
 */
export function d2cIntakeToClientFields(
  intake: D2cIntake,
): Partial<ClientDraftFields> {
  const fields: Partial<ClientDraftFields> = {};

  if (intake.dateOfBirth) {
    fields.dateOfBirth = intake.dateOfBirth;
  }

  if (intake.gender) {
    fields.sex = genderToSex(intake.gender);
  }

  if (intake.province) {
    fields.province = intake.province;
  }

  fields.smoker = intake.tobaccoUse;

  if (intake.healthClass) {
    fields.healthRating = healthClassToRating(intake.healthClass);
  }

  if (intake.annualIncome > 0) {
    fields.clientIncome = numberToDecimalString(intake.annualIncome);
  }

  if (intake.coverageAmount > 0) {
    fields.existingLifeInsuranceCoverage = numberToDecimalString(
      intake.coverageAmount,
    );
  }

  if (intake.termYears > 0) {
    fields.replacementDurationYears = intake.termYears;
  }

  return fields;
}

// ============================================================================
// Client -> D2cIntake (for resuming from DB)
// ============================================================================

/**
 * Converts a Client DB record back to D2cIntake form state.
 * Used when a consumer resumes a draft application.
 */
export function clientFieldsToD2cIntake(client: ClientDraftFields): D2cIntake {
  return {
    dateOfBirth: client.dateOfBirth ?? "",
    gender: sexToGender(client.sex),
    province: client.province as D2cIntake["province"],
    tobaccoUse: client.smoker ?? false,
    annualIncome: decimalStringToNumber(client.clientIncome),
    coverageAmount: decimalStringToNumber(client.existingLifeInsuranceCoverage),
    termYears: client.replacementDurationYears ?? 20,
    healthClass: healthRatingToClass(client.healthRating),
  };
}

/**
 * Determines draft completeness as a fraction (0-1) based on
 * which required intake fields are populated.
 *
 * Used for progress indicators in the dashboard.
 */
export function getDraftCompleteness(intake: D2cIntake): number {
  const requiredChecks = [
    intake.province !== "",
    intake.dateOfBirth !== "",
    intake.annualIncome > 0,
  ];

  const optionalChecks = [
    intake.gender !== "",
    intake.coverageAmount > 0,
    intake.healthClass !== "",
  ];

  const requiredComplete = requiredChecks.filter(Boolean).length;
  const optionalComplete = optionalChecks.filter(Boolean).length;

  // Required fields carry 70% weight, optional 30%
  const requiredWeight = 0.7;
  const optionalWeight = 0.3;

  return (
    (requiredComplete / requiredChecks.length) * requiredWeight +
    (optionalComplete / optionalChecks.length) * optionalWeight
  );
}
