/**
 * @fileoverview D2C estimate assumption constants.
 *
 * Defines versioned assumption sets for the D2C insurance needs estimate engine.
 * These constants replace the hardcoded "magic numbers" previously scattered in
 * the estimate page component, making them versionable, auditable, and reusable.
 *
 * When assumptions change (regulatory update, product change), add a new version
 * constant and update `CURRENT_ASSUMPTION_VERSION` — do not mutate existing versions.
 *
 * @see Issue #226
 */

import type { AssumptionParameters } from "@/server/db/schemas/estimate-runs-schema";

// ============================================================================
// VERSION METADATA
// ============================================================================

/**
 * Metadata for an assumption version, combining the DB-seeded fields
 * with the runtime parameters.
 */
export interface AssumptionVersionDefinition {
  /** Human-readable label stored in the DB (e.g., "ca-term-life-v1") */
  versionLabel: string;
  /** Product line identifier */
  productLine: string;
  /** Effective start date (inclusive) */
  effectiveFrom: string;
  /** Effective end date (exclusive), null = currently active */
  effectiveTo: string | null;
  /** The assumption parameters */
  parameters: AssumptionParameters;
  /** Change notes for audit trail */
  changeNotes: string;
}

// ============================================================================
// CA TERM LIFE V1 — Launch assumptions (D2C MVP)
// ============================================================================

/**
 * Canada term life v1 assumption parameters.
 *
 * Mirrors the hardcoded values from the original estimate page:
 * - 70% income replacement (conservative baseline for single-income households)
 * - 15-year replacement duration (covers dependent years)
 * - $25,000 fixed estate buffer (funeral + estate settlement costs in Canada)
 * - Zero defaults for existing coverage/debts/assets (D2C intake doesn't collect these)
 */
export const CA_TERM_LIFE_V1_PARAMS: AssumptionParameters = {
  incomeReplacementPercent: 70,
  replacementDurationYears: 15,
  estateBuffer: {
    type: "fixed",
    value: 25_000,
  },
  existingCoverageDefault: 0,
  totalDebtsDefault: 0,
  liquidAssetsDefault: 0,
};

/**
 * Full definition for the CA term life v1 assumption version.
 * Used for DB seeding and runtime reference.
 */
export const CA_TERM_LIFE_V1: AssumptionVersionDefinition = {
  versionLabel: "ca-term-life-v1",
  productLine: "ca-term-life",
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  parameters: CA_TERM_LIFE_V1_PARAMS,
  changeNotes:
    "Initial D2C launch assumptions for Canadian term life estimates",
};

// ============================================================================
// CURRENT VERSION
// ============================================================================

/**
 * The currently active assumption version definition.
 * All new estimate runs use this version's parameters.
 *
 * To change assumptions: create a new version constant, set effectiveTo on the
 * old one, and point this export to the new version.
 */
export const CURRENT_ASSUMPTION_VERSION = CA_TERM_LIFE_V1;

// ============================================================================
// ENGINE METADATA
// ============================================================================

/** Engine identifier for the insurance needs calculator */
export const ESTIMATE_ENGINE_ID = "insurance-needs-v1";

/** Engine version — bump when calculation logic changes */
export const ESTIMATE_ENGINE_VERSION = "1.0.0";
