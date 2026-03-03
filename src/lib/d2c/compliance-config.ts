/**
 * @fileoverview Compliance copy configuration for D2C consent/disclosure step.
 *
 * All text here is PLACEHOLDER copy pending formal legal review.
 * Do NOT use in production without legal sign-off.
 *
 * Issue #165 — D2C v1 consent & authorization capture.
 */

// TODO: Replace with legal-approved copy before production launch.

export const complianceConfig = {
  /**
   * Consent to transmit application data to the carrier.
   * Must be accepted before submission.
   */
  // TODO: Replace with legal-approved copy
  transmitConsentText:
    "⚠️ Placeholder — Pending Legal Review\n" +
    "I consent to InsurFlow transmitting my application data to the selected insurance carrier(s) for the purpose of underwriting and processing my application.",

  /**
   * Authorization to collect and share health information.
   * Must be accepted before submission.
   */
  // TODO: Replace with legal-approved copy
  healthAuthorizationText:
    "⚠️ Placeholder — Pending Legal Review\n" +
    "I authorize InsurFlow and its partners to collect and share relevant health information for the purpose of underwriting my application.",

  /**
   * E-sign intent acknowledgment.
   * Must be accepted before submission.
   */
  // TODO: Replace with legal-approved copy
  esignIntentText:
    "⚠️ Placeholder — Pending Legal Review\n" +
    "I acknowledge that by submitting this application electronically I intend this to serve as my electronic signature, with the same legal effect as a handwritten signature.",
} as const;
