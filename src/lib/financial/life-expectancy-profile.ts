import type { HealthClass, Sex } from "@/lib/financial/mortality-tables";

const VALID_HEALTH_CLASSES = new Set<HealthClass>([
  "preferred_plus",
  "preferred",
  "standard_plus",
  "standard",
  "substandard",
]);

// Product default when sex is unknown in lightweight intake/demo contexts.
const DEFAULT_SEX: Sex = "M";

export function getAgeFromDateOfBirth(dateOfBirth: string): number {
  if (!dateOfBirth) return 0;

  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return 0;

  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return Math.max(0, age);
}

export function normalizeHealthClass(
  healthRating: string | undefined,
): HealthClass {
  if (healthRating && VALID_HEALTH_CLASSES.has(healthRating as HealthClass)) {
    return healthRating as HealthClass;
  }

  return "standard";
}

export function normalizeLifeExpectancySex(
  sexOrGender: string | undefined,
): Sex {
  if (sexOrGender === "F" || sexOrGender === "female") return "F";
  if (sexOrGender === "M" || sexOrGender === "male") return "M";
  return DEFAULT_SEX;
}
